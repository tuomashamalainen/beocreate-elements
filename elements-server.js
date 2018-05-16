/* (c) 2017-2018 Tuomas Hämäläinen
 Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.*/


// BEOCREATE ELEMENTS
// Node.js
// This is intended to be run on the sound system itself.

// DEPENDENCIES
var communicator = require("./beocreate_essentials/communication");
var sourceModule = require("./beocreate_essentials/sources");
var beoDSP = require("./beocreate_essentials/dsp");
var piSystem = require("./beocreate_essentials/pi_system_tools");
var wifi = require("./beocreate_essentials/wifi_setup");
var sourceModule = require("./beocreate_essentials/sources");
var beoLED = require("./beocreate_essentials/led");
//var beoEssence = require("./beocreate_extras/essence");
var fs = require('fs');
var http = require('http');

var beoCom = communicator();
var beoSources = sourceModule.SourceManager();
//var essence = beoEssence.Remote();


// CONFIGURATION FILE R/W
var beoConfigFile = "/home/pi/beoconfig-elements.json";


var beoconfig = JSON.parse( // Read configuration file.
	fs.readFileSync(beoConfigFile)
);

function saveConfiguration() { // Save configuration file.
	fs.writeFileSync(beoConfigFile, JSON.stringify(beoconfig));
}

var configSaveTimeout = null;
function saveConfigurationWithDelay() {
	clearTimeout(configSaveTimeout);
	configSaveTimeout = setTimeout(function() {
		saveConfiguration();
	}, 10000);
}

var systemName = "BeoSound Elements";
var sampleRate = 48000;

if (beoconfig.systemInformation.systemName) systemName = beoconfig.systemInformation.systemName;
//var hostname = beoconfig.setup.hostname;
//var flashed = beoconfig.setup.flashed;
//var sourceList = beoconfig.sources;

if (!beoconfig.soundPreset) {
	beoconfig.soundPreset = {};
}


// PRESET FOLDER CREATION
var presetFolder = "/home/pi/sound-presets/";
if (!fs.existsSync(presetFolder)) {
    fs.mkdirSync(presetFolder);
}

beoCom.start({name: systemName}); // Opens the server up for remotes to connect.


wifi.initialise('autoHotspot');

var dspDictionary = beoDSP.readDictionary("/home/pi/dsp/ParamAddress.dat"); // Reads the DSP parameter addresses into memory.
beoDSP.connectDSP(function(success) {  
	if (success) {
		for (var i = 0; i < 3; i++) {
			// Before the phantom write issue is fixed in the Sigma DSP Daemon, this will read from a register three times to get past them.
			beoDSP.readDSP(16, function(response) { 
			
			}, true);
		}
		loadAllDSPSettings();
	}
}); // Opens a link with the SigmaDSP daemon.



// COMMUNICATION WITH CLIENTS

beoCom.on("open", function(ID, protocol) {  
	console.log('Connection '+ID+' opened with protocol '+protocol);
});

beoCom.on("data", function(data, connection){
	// Determine what kind of data was received and send it on for further processing.
	switch (data.header) {
		case "dsp":
			dsp(data.content);
			break;
		case "wifi":
			wifiFunctions(data.content);
			break;
		case "setup":
			manageSetup(data.content);
			break;
		case "system":
			manageSystem(data.content);
			break;
		case "handshake":
			handshake(data.content);
			break;
		case "sources":
			manageSources(data.content);
			break;
		case "soundProfile":
			manageSoundProfile(data.content);
			break;
		case "led":
			beoLED.fadeTo({rgb: data.content.rgb, speed: data.content.speed});
			break;
	}
});


function handshake(content) {
	beoCom.send({header: "handshake", content: {cacheIndex: cacheIndex, systemName: systemName}});
}


// CACHE
// Cache indices are incrementing counters. The client can compare its indices with the server to determine if it needs to get new data.
var cacheIndex = {sound: 0, playerMetadata: 0};
function incrementCacheIndex(counter) {
	if (counter) {
		cacheIndex[counter]++;
		if (cacheIndex[counter] > 100000) cacheIndex[counter] = 0;
	}
}

// DSP FUNCTIONS
// These features rely on a specific, "general-purpose" DSP program to be loaded in BeoCreate 4-Channel Amplifier, and that a matching ParamAddress.dat file is available. Otherwise they will not work and will likely result in disturbing noises being played through the loudspeakers.

var soundPresets = [];

function dsp(content) {
	switch (content.operation) {
	
		// GET
		case "getChannelSettings":
			beoCom.send({header: "dsp", content: {type: "channelSettings", channels: beoconfig.channels}});
			break;
		case "getSpeakerTypesAndRoles":
			types = [];
			roles = [];
			for (var c = 0; c < beoconfig.channels.length; c++) {
				types.push(beoconfig.channels[c].type);
				roles.push(beoconfig.channels[c].role);
			}
			beoCom.send({header: "dsp", content: {type: "speakerTypesAndRoles", speakerTypes: types, speakerRoles: roles}});
			break;
		case "listCustomPresets":
			listCustomSoundPresets();
			break;
		case "getCustomPreset":
			if (content.presetIndex != undefined) {
				if (soundPresets && soundPresets[content.presetIndex]) {
					beoCom.send({header: "dsp", content: {type: "customPresetDetails", preset: soundPresets[content.presetIndex], presetIndex: content.presetIndex}});
				}
			}
			break;
			
		// SET
		case "setCrossover":
			// Sets the crossover filters for a channel.
			if (beoconfig.channels[content.channel].crossover.hp != content.hp) {
				beoconfig.channels[content.channel].crossover.hp = content.hp;
				loadDSPSettings(content.channel, "crossover", "hp");
			}
			if (beoconfig.channels[content.channel].crossover.lp != content.lp) {
				beoconfig.channels[content.channel].crossover.lp = content.lp;
				loadDSPSettings(content.channel, "crossover", "lp");
			}
			driverType = getDriverType([beoconfig.channels[content.channel].crossover.hp, beoconfig.channels[content.channel].crossover.lp]);
			beoconfig.channels[content.channel].type = driverType;
			beoconfig.soundPreset.modified = true;
			saveConfigurationWithDelay();
			incrementCacheIndex("sound");
			break;
		case "setCrossoverType":
			crossoverTypes = ["bw12", "lr24"];
			if (content.hpType) {
				if (crossoverTypes.indexOf(content.hpType) != -1) {
					beoconfig.channels[content.channel].crossover.hpType = content.hpType;
					loadDSPSettings(content.channel, "crossover", "hp");
				}
			}
			if (content.lpType) {
				if (crossoverTypes.indexOf(content.lpType) != -1) {
					beoconfig.channels[content.channel].crossover.lpType = content.lpType;
					loadDSPSettings(content.channel, "crossover", "lp");
				}
			}
			incrementCacheIndex("sound");
			saveConfigurationWithDelay();
			break;
		case "setInvert":
			if (content.invert != undefined) {
				beoconfig.channels[content.channel].invert = content.invert;
				saveConfigurationWithDelay();
				beoconfig.soundPreset.modified = true;
				loadDSPSettings(content.channel, "invert");
				incrementCacheIndex("sound");
			}
			break;
		case "setMute":
			if (content.mute != undefined) {
				beoconfig.channels[content.channel].mute = content.mute;
				saveConfigurationWithDelay();
				beoconfig.soundPreset.modified = true;
				loadDSPSettings(content.channel, "mute");
				incrementCacheIndex("sound");
			}
		case "setRole":
			if (content.role) {
				switch (content.role) {
					case "left":
					case "right":
					case "mono":
						beoconfig.channels[content.channel].role = content.role;
						saveConfigurationWithDelay();
						beoconfig.soundPreset.modified = true;
						incrementCacheIndex("sound");
						loadDSPSettings(content.channel, "role");
						break;
				}
			}
			break;
		case "setMSRatio":
			if (content.msRatio >= 0 && content.msRatio <= 1) {
				beoconfig.channels[content.channel].msRatio = content.msRatio;
				saveConfigurationWithDelay();
				beoconfig.soundPreset.modified = true;
				incrementCacheIndex("sound");
				loadDSPSettings(content.channel, "msRatio");
			}
			break;
		case "setFilter":
			// Sets a filter for a channel.
			beoconfig.channels[content.channel].filters[content.filter].Fc = content.Fc;
			beoconfig.channels[content.channel].filters[content.filter].Q = content.Q;
			beoconfig.channels[content.channel].filters[content.filter].boost = content.boost;
			beoconfig.channels[content.channel].filters[content.filter].gain = content.gain;
			beoconfig.channels[content.channel].filters[content.filter].enabled = content.enabled;
			beoconfig.soundPreset.modified = true;
			incrementCacheIndex("sound");
			saveConfigurationWithDelay();
			
			//applyFilter(content.channel, content.filter, "peak", content.Fc, content.boost, content.Q, content.gain);
			//coeffs = beoDSP.peak(sampleRate, content.Fc, content.boost, content.Q, content.gain);
			//registerPrefix = beoconfig.channels[content.channel].filterRegisterPrefix;
			//safeloadWrite([coeffs[5], coeffs[4], coeffs[3], coeffs[2]*-1, coeffs[1]*-1], registerPrefix+".B2_"+(content.filter+1), true);
			loadDSPSettings(content.channel, "filter", content.filter);
			
			break;
		case "setChannelFilters":
			// Sets all filters for a channel.
			beoconfig.channels[content.channel].filters = content.filters;
			beoconfig.soundPreset.modified = true;
			incrementCacheIndex("sound");
			saveConfigurationWithDelay();
			//registerPrefix = beoconfig.channels[content.channel].filterRegisterPrefix;
			for (var i = 0; i < content.filters.length; i++) {
				//coeffs = beoDSP.peak(sampleRate, content.filters[i].Fc, content.filters[i].boost, content.filters[i].Q, content.filters[i].gain);
				//safeloadWrite([coeffs[5], coeffs[4], coeffs[3], coeffs[2]*-1, coeffs[1]*-1], registerPrefix+".B2_"+(i+1), true);
				loadDSPSettings(content.channel, "filter", i);
			}
			break;
		case "saveCustomPreset":
			presetIndex = null;
			for (var i = 0; i < soundPresets.length; i++) {
				if (soundPresets[i].fileName == content.fileName) {
					presetIndex = i;
				}
			}
			
			if (presetIndex == null) {
				writeCustomSoundPreset(content.name, content.fileName);
				beoconfig.soundPreset.currentPreset = content.fileName;
				beoconfig.soundPreset.modified = false;
				saveConfigurationWithDelay();
				listCustomSoundPresets();
			} else {
				if (content.overwrite) {
					writeCustomSoundPreset(content.name, content.fileName);
					beoconfig.soundPreset.currentPreset = content.fileName;
					beoconfig.soundPreset.modified = false;
					saveConfigurationWithDelay();
					listCustomSoundPresets();
				} else {
					beoCom.send({header: "dsp", content: {type: "customPresetExists", presetIndex: presetIndex, name: soundPresets[presetIndex].name, fileName: soundPresets[presetIndex].fileName}});
				}
			}
			break;
		case "loadCustomPreset":
			if (content.presetIndex != undefined) {
				if (content.settings) {
					loadCustomSoundPreset(content.presetIndex, content.settings);
				} else {
					loadCustomSoundPreset(content.presetIndex);
				}
			}
			break;
		case "renameCustomPreset":
			if (content.presetIndex != undefined) {
				updatedPreset = soundPresets[content.presetIndex];
				updatedPreset.name = content.newName;
				updatedPreset.fileName = content.newFileName;
				fs.unlinkSync(presetFolder+content.oldFileName+".json");
				fs.writeFileSync(presetFolder+newFileName+".json", JSON.stringify(updatedPreset));
			}
			break;
		case "deleteCustomPreset":
			
			break;
	}
}

function listCustomSoundPresets() {
	soundPresets = [];
	presetNames = [];
	fs.readdirSync(presetFolder).forEach(file => {
		try {
			preset = JSON.parse(
				fs.readFileSync(presetFolder+file)
			);
		}
		catch (err) {
			console.log(err);
			preset = null;
		}
		if (preset != null && preset.name) {
			soundPresets.push(preset);
			presetNames.push(preset.name);
		}
	});
	if (soundPresets.length > 0) {
		presetModified = false;
		currentPreset = null;
		if (beoconfig.soundPreset) {
			if (beoconfig.soundPreset.currentPreset) {
				for (var i = 0; i < soundPresets.length; i++) {
					if (beoconfig.soundPreset.currentPreset == soundPresets[i].fileName) currentPreset = i;
				}
			}
			if (beoconfig.soundPreset.modified) presetModified = true;
		}
		beoCom.send({header: "dsp", content: {type: "customPresets", presets: presetNames, presetModified: presetModified, currentPreset: currentPreset}});
	} else {
		beoCom.send({header: "dsp", content: {type: "customPresets", presets: null}});
	}
}

function loadCustomSoundPreset(index, settings) {
	if (index != undefined) {
		if (!settings) settings = ['crossover', 'filters', 'toneTouch', 'role'];
		for (var i = 0; i < settings.length; i++) {
			switch (settings[i]) {
				case "crossover":
					for (var c = 0; c < 4; c++) {
						beoconfig.channels[c].crossover = Object.assign({}, soundPresets[index].channels[c].crossover);
					}
					break;
				case "filters":
					for (var c = 0; c < 4; c++) {
						beoconfig.channels[c].filters = soundPresets[index].channels[c].filters.slice();
					}
					break;
				case "toneTouch":
					for (var c = 0; c < 4; c++) {
						beoconfig.channels[c].msRatio = soundPresets[index].channels[c].msRatio;
					}
					beoconfig.toneTouch = Object.assign({}, soundPresets[index].toneTouch);
					break;
				case "role":
					for (var c = 0; c < 4; c++) {
						beoconfig.channels[c].role = soundPresets[index].channels[c].role;
					}
					break;
			}
		}
		beoconfig.soundPreset.currentPreset = soundPresets[index].fileName;
		beoconfig.soundPreset.modified = false;
		saveConfigurationWithDelay();
		loadAllDSPSettings();
		beoCom.send({header: "dsp", content: {type: "customPresetLoaded", presetIndex: index, presetName: presetNames[index]}});
		beoCom.send({header: "dsp", content: {type: "channelSettings", channels: beoconfig.channels}});
	}
}

function writeCustomSoundPreset(name, fileName) {
	// Saves a sound preset with current adjustments.
	newPreset = {name: name, fileName: fileName, toneTouch: Object.assign({}, beoconfig.toneTouch), channels: Object.assign({}, beoconfig.channels)};
	for (var c = 0; c < 4; c++) {
		delete newPreset.channels[c].registers;
	}
	fs.writeFileSync(presetFolder+fileName+".json", JSON.stringify(newPreset));
}

function loadAllDSPSettings() {
	// Loads and applies DSP settings from BeoConfig.
	for (var c = 0; c < beoconfig.channels.length; c++) {
		
		// Load crossover
		loadDSPSettings(c, "crossover", "hp");
		loadDSPSettings(c, "crossover", "lp");
		
		// Load speaker roles
		loadDSPSettings(c, "role");
		
		// Load speaker roles
		loadDSPSettings(c, "mute");
		
		// Load mid/side mixer setting
		loadDSPSettings(c, "msRatio");
		
		// Load equaliser filters
		for (var i = 0; i < beoconfig.channels[c].filters.length; i++) {
			loadDSPSettings(c, "filter", i);
		}
		
		// Load ToneTouch
	}
}

function loadDSPSettings(channel, property, target) {
	switch (property) {
		case "crossover":
			if (target == "hp") {
				registerPrefix = beoconfig.channels[channel].registers.hpFilterRegisterPrefix;
				if (beoconfig.channels[channel].crossover.hp != null) {
					coeffs = beoDSP.highPass(sampleRate, beoconfig.channels[channel].crossover.hp, 0);
					safeloadWrite([coeffs[5], coeffs[4], coeffs[3], coeffs[2]*-1, coeffs[1]*-1], registerPrefix+".B2_1", true);
					if (beoconfig.channels[channel].crossover.hpType == "lr24") {
						safeloadWrite([coeffs[5], coeffs[4], coeffs[3], coeffs[2]*-1, coeffs[1]*-1], registerPrefix+".B2_2", true);
					}
				} else {
					safeloadWrite([0, 0, 1, 0, 0], registerPrefix+".B2_1", true);
					safeloadWrite([0, 0, 1, 0, 0], registerPrefix+".B2_2", true);
				}
			}
			if (target == "lp") {
				registerPrefix = beoconfig.channels[channel].registers.lpFilterRegisterPrefix;
				if (beoconfig.channels[channel].crossover.lp != null) {
					coeffs = beoDSP.lowPass(sampleRate, beoconfig.channels[channel].crossover.lp, 0);
					safeloadWrite([coeffs[5], coeffs[4], coeffs[3], coeffs[2]*-1, coeffs[1]*-1], registerPrefix+".B2_1", true);
					if (beoconfig.channels[channel].crossover.lpType == "lr24") {
						safeloadWrite([coeffs[5], coeffs[4], coeffs[3], coeffs[2]*-1, coeffs[1]*-1], registerPrefix+".B2_2", true);
					}
				} else {
					safeloadWrite([0, 0, 1, 0, 0], registerPrefix+".B2_1", true);
					safeloadWrite([0, 0, 1, 0, 0], registerPrefix+".B2_2", true);
				}
			}
			break;
		case "filter":
			if (beoconfig.channels[channel].filters[target].enabled) {
				coeffs = beoDSP.peak(sampleRate, beoconfig.channels[channel].filters[target].Fc, beoconfig.channels[channel].filters[target].boost, beoconfig.channels[channel].filters[target].Q, beoconfig.channels[channel].filters[target].gain);
			} else {
				coeffs = [1,0,0,1,0,0];
			}
			registerPrefix = beoconfig.channels[channel].registers.filterRegisterPrefix;
			safeloadWrite([coeffs[5], coeffs[4], coeffs[3], coeffs[2]*-1, coeffs[1]*-1], registerPrefix+".B2_"+(target+1), true);
			break;
		case "invert":
			register = beoconfig.channels[channel].registers.invertRegister;
			inverted = beoconfig.channels[channel].invert ? 1 : 0;
			beoDSP.writeDSP(register, inverted, false, false);
			break;
		case "mute":
			register = beoconfig.channels[channel].registers.muteRegister;
			enabled = beoconfig.channels[channel].mute ? 0 : 1;
			beoDSP.writeDSP(register, enabled, false, false);
			break;
		case "role":
			register = beoconfig.channels[channel].registers.roleRegister;
				switch (beoconfig.channels[channel].role) {
					case "left":
						roleIndex = 0;
						break;
					case "right":
						roleIndex = 1;
						break;
					case "mono":
						roleIndex = 2;
						break;
					default:
						roleIndex = 0;
						break;
				}
				beoDSP.writeDSP(register, roleIndex, false, false);
			break;
		case "msRatio":
			register = beoconfig.channels[channel].registers.msRegister;
			msRatio = beoconfig.channels[channel].msRatio;
			if (msRatio >= 0 && msRatio <= 1) {
				beoDSP.writeDSP(register, msRatio, true, false);
			}
			break;
		case "toneTouch":
			break;
	}
}

function applyFilter(channel, filter, type, Fc, boost, Q, gain) {
	// Writes the filters to the DSP.
	switch (type) {
		case "peak":
			registerPrefix = beoconfig.channels[channel].filterRegisterPrefix;
			trueIndex = filter+1;
			//console.log("Sending coefficients to "+registerPrefix+"B2_"+trueIndex+" ("+dspDictionary[registerPrefix+".B2_"+trueIndex]+")...");
			coeffs = beoDSP.peak(sampleRate, Fc, boost, Q, gain);
			// Old, failed safeload method:
			/*beoDSP.writeDSP(registerPrefix+".B2_"+trueIndex, coeffs[5], true, false, true);
			beoDSP.writeDSP(registerPrefix+".B1_"+trueIndex, coeffs[4], true, false, true);
			beoDSP.writeDSP(registerPrefix+".B0_"+trueIndex, coeffs[3], true, false, true);
			beoDSP.writeDSP(registerPrefix+".A2_"+trueIndex, coeffs[2], true, false, true);
			beoDSP.writeDSP(registerPrefix+".A1_"+trueIndex, coeffs[1], true, false, true);*/
			// New, correct safeload method:
			// Write data to safeload registers:
			//console.log(coeffs[5], coeffs[4], coeffs[3], coeffs[2], coeffs[1]);
			//console.log(biquadDataStartRegister);
			
			safeloadWrite([coeffs[5], coeffs[4], coeffs[3], coeffs[2]*-1, coeffs[1]*-1], registerPrefix+".B2_"+trueIndex, true);
			
			break;
		case "crossoverHP":
			coeffs = beoDSP.lowPass(sampleRate, Fc, 0);
			break;
		case "crossoverLP":
			coeffs = beoDSP.highPass(sampleRate, Fc, 0);
			break;
	}
}

function safeloadWrite(dataArray, startRegister, forceDecimal) {
	// Get the address of the first safeload data register:
	safeloadDataRegister = dspDictionary["__SafeLoad_Module__.data_SafeLoad"];
	// Get the address of the first target register:
	startRegisterAddress = dspDictionary[startRegister];
	// Write to safeload registers
	for (var i = 0; i < dataArray.length; i++) {
		beoDSP.writeDSP(safeloadDataRegister+i, dataArray[i], true, forceDecimal);
	}
	// Write the start address for the data:
	beoDSP.writeDSP("__SafeLoad_Module__.address_SafeLoad", startRegisterAddress, false, false);
	// Write the number of words to safeload:
	beoDSP.writeDSP("__SafeLoad_Module__.num_SafeLoad", dataArray.length, false, false);
}

// Determines the type of the loudspeaker driver based on the given frequency range.
function getDriverType(range) {
	// If nulls are provided (HP/LP off), replace with default values.
	if (range[0] == null) range[0] = 10;
	if (range[1] == null) range[1] = 20000;
	
	// Look at low-end extension first and then match that with high-end extension.
	
	if (range[0] < 200) { // Woofer-like low-end
		if (range[1] > 3000) {
			driverType = "full-range";
		} else if (range[1] > 800) {
			driverType = "mid-woofer";
		} else {
			driverType = "woofer";
		}
	} else if (range[0] < 1000) { // Midrange-like low-end
		if (range[1] > 3000) {
			driverType = "mid-tweeter";
		} else {
			driverType = "midrange";
		}
	} else { // Unquestionably this is a tweeter.
		driverType = "tweeter";
	}
	return driverType;
}


// STATUS LED

// Initialise LED
beoLED.initialise(5, 6, 12);
beoLED.fadeTo({rgb: [255, 0, 0], speed: "normal"});
//beoLED.fadeTo({rgb: [50, 255, 0], speed: "fast"});


// SOURCES
beoSources.initialise();

beoSources.on("wake", function(event) { // Called when the system activates after a source starts.
	beoLED.fadeTo({rgb: [0, 255, 0], speed: "fast", fadeOutAfter: 10});
});

beoSources.on("sleep", function(event) { // Called when the system goes to "standby" after last source deactivates.
	beoLED.fadeTo({rgb: [255, 0, 0], speed: "fast"});
});

beoSources.on("metadata", function(event) {
	beoCom.send({header: "metadata", content: event});
});


// WI-FI

function wifiFunctions(content) {
	switch (content.operation) {
		case "listSaved":
			wifi.listSaved(function(savedNetworks, error) {  
				beoCom.send({header: "wifi", content: {type: "saved", networks: savedNetworks}});
			});
			break;
		case "listAvailable":
			wifi.listAvailable(function(availableNetworks) {  
				beoCom.send({header: "wifi", content: {type: "available", networks: availableNetworks}});
			});
			break;
		case "add":
			wifi.addNetwork(content.options, function(theSSID, err) {  
				beoCom.send({header: "wifi", content: {type: "added", SSID: theSSID}});
			});
			break;
		case "remove":
			wifi.removeNetwork(content.ID, function(theID, err) {  
				beoCom.send({header: "wifi", content: {type: "removed", ID: theID, error: err}});
			});
		case "status":
			wifi.getStatus(function(status) {  
				beoCom.send({header: "wifi", content: {type: "status", status: status}});
			});
			break;
		case "setMode":
			wifi.mode(content.mode, function() {  
				beoCom.disconnectAll();
			});
			break;
		case "ip":
			wifi.getIP(function(ipAddress) {  
				beoCom.send({header: "wifi", content: {type: "ip", ip: ipAddress}});
			});
			break;
	}
}


// SYSTEM

function manageSystem(content) {
	switch (content.operation) {
		case "shutDown":
			piSystem.power("shutdown");
			break;
		case "restart":
			piSystem.power("reboot");
			break;
	}
}


// BEOSOUND ESSENCE
//essence.initialise();