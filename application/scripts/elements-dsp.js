// BANG & OLUFSEN
// BeoCreate Elements
// DSP
// All sound-related functions are in this file. Plotting graphs has been moved to elements-grapher.js for better portability.

var sampleRate = 48000;
var maxFilters = 14; // Maximum amount of filters supported by the program, including low-pass and high-pass filters at positions 0, 1, 2 and 3.

var channels = []; // Stores all sound settings for all channels.


var channelColourNames = ["red", "yellow", "green", "blue"];



// DSP DATA RECEIVER
// Processes any data received from the speakers marked with the "dsp" header.

function dspDataReceiver(content) {
	//console.log(content);
	switch (content.type) {
		case "customPresets":
			//console.log(content.presets);
			if (content.presets != null) {
				$("#custom-sound-preset-list").empty();
				for (var i = 0; i < content.presets.length; i++) {
					$("#custom-sound-preset-list").append('<div class="menu-item icon left checkbox swipe-delete custom-sound-preset-item custom-sound-preset-item-'+i+'" onclick="viewCustomSoundPreset('+i+');"><img class="menu-icon checkmark left" src="symbols-black/checkmark.svg"><div class="menu-label">'+content.presets[i]+'</div><img class="menu-icon right delete" src="symbols-black/delete.svg"><div class="swipe-delete-button">Delete</div></div>');
				}
				$("#custom-sound-preset-wrap").removeClass("hidden");
				$("#no-sound-presets-prompt").addClass("hidden");
				if (content.currentPreset != undefined) {
					$(".custom-sound-preset-item-"+content.currentPreset).addClass("checked");
					if (content.presetModified) {
						$(".custom-sound-preset-item-"+content.currentPreset+" .menu-icon").attr("src", "symbols-black/line.svg");
					}
				}
			} else {
				$("#custom-sound-preset-wrap").addClass("hidden");
				$("#no-sound-presets-prompt").removeClass("hidden");
			}
			break;
		case "customPresetExists":
			console.log("Product says preset exists.");
			break;
		case "customPresetDetails":
			if (content.preset) {
				populateCustomSoundPresetInfo(content.preset);
				preflightingSoundPreset = content.presetIndex;
				presetPreflightSettings = ['role', 'crossover', 'filters', 'toneTouch'];
				$("#preset-preflight checkbox").addClass("checked");
				
				$("#sound-preset-details").addClass("visible");
			}
			break;
		case "customPresetLoaded":
			$("#sound-preset-details").removeClass("visible");
			notify(content.presetName + " applied", "", "done");
			$(".custom-sound-preset-item").removeClass("checked");
			$(".custom-sound-preset-item-"+content.presetIndex).addClass("checked");
			$(".custom-sound-preset-item-"+content.presetIndex+" .menu-icon").attr("src", "symbols-black/checkmark.svg");
			break;
		case "channelSettings":
			channels = content.channels;
			break;
		case "speakerSetup":
			for (var c = 0; c < content.speakerTypes.length; c++) {
				channels[c].type = content.speakerTypes[c];
				channels[c].role = content.speakerRoles[c];
				channels[c].mute = content.muteStates[c];
			}
			loadSpeakerSetup();
			break;
		case "allFilters":
			channels = content.channels;
			loadFilters();
			break;
		case "mute":
			if (content.muteChannel != undefined) {
				channels[content.muteChannel].mute = content.mute;
				if (content.mute == true) {
					$("#speaker-type-channel-"+content.muteChannel+" .speaker-enabled img").attr("src", "symbols-black/volume-mute.svg").removeClass("selected");
				} else {
					$("#speaker-type-channel-"+content.muteChannel+" .speaker-enabled img").attr("src", "symbols-black/volume.svg").addClass("selected");
				}
			}
			break;
	}
}



// MANAGE PRESETS

function saveCustomSoundPreset() {
	options = {placeholders: {text: "Preset Name"}, minLength: {text: 3}};
	startTextInput(1, "Save Preset", "Enter a name for this sound preset.", options, function(details) {
		sendToProduct({header: "dsp", content: {operation: "saveCustomPreset", name: details.text, fileName: generateHostname(details.text)}});
		// Uses the hostname generator to generate a file name.
	});
}

function viewCustomSoundPreset(index) {
	if (index != undefined) {
		sendToProduct({header: "dsp", content: {operation: "getCustomPreset", presetIndex: index}});
	} else {
		$("#sound-preset-details").removeClass("visible");
		preflightingSoundPreset = null;
	}
}

function populateCustomSoundPresetInfo(preset) {
	$("#sound-preset-details header h1").text(preset.name);
	for (var c = 0; c < 4; c++) {
		// Role
		
		if (preset.channels[c].mute == true) {
			$(".role-preview .channel-"+c+" span").text("off");
			$(".role-preview .channel-"+c).addClass("off");
		} else {
			$(".role-preview .channel-"+c+" span").text(preset.channels[c].role);
			$(".role-preview .channel-"+c).removeClass("off");
		}
		
		// Crossover
		offsetLeft = 0;
		offsetRight = 0;
		if (preset.channels[c].crossover.hp != null) {
			offsetLeft = convertHz(preset.channels[c].crossover.hp, "linear", 100);
		}
		if (preset.channels[c].crossover.lp != null) {
			offsetRight = 100 - convertHz(preset.channels[c].crossover.lp, "linear", 100);
		}
		$("#compact-crossover-"+c+" .fill").css("margin-left", offsetLeft+"%").css("margin-right", offsetRight+"%");
		
		typeUI = getSpeakerTypeNameAndIcon(preset.channels[c].type)[0];
		$("#compact-crossover-"+c+" .fill .driver-type").text(typeUI);
	}
	
}


var presetPreflightSettings = ['role', 'crossover', 'filters', 'toneTouch'];
var preflightingSoundPreset = null;

function soundPresetPreflightToggle(item) {
	switch (item) {
		case "role":
		case "crossover":
		case "filters":
			toggleItem = item;
			break;
		case "toneTouch":
			toggleItem = "tone-touch";
			break;
	}
	itemIndex = presetPreflightSettings.indexOf(item);
	if (itemIndex != -1) {
		presetPreflightSettings.splice(itemIndex, 1);
		$("#preset-preflight-"+toggleItem).removeClass("checked");
	} else {
		presetPreflightSettings.push(item);
		$("#preset-preflight-"+toggleItem).addClass("checked");
	}
	
	$("#apply-sound-preset-button").removeClass("disabled");
	if (presetPreflightSettings.length == 4) {
		$("#apply-sound-preset-button").text("Apply All Adjustments");
	} else if (presetPreflightSettings.length == 0) {
		$("#apply-sound-preset-button").text("Apply Adjustments");
		$("#apply-sound-preset-button").addClass("disabled");
	} else if (presetPreflightSettings.length == 1) {
		$("#apply-sound-preset-button").text("Apply One Adjustment");
	} else {
		$("#apply-sound-preset-button").text("Apply "+presetPreflightSettings.length+" Adjustments");
	}

}

function applySoundPreset() {
	if (preflightingSoundPreset != null) {
		sendToProduct({header: "dsp", content: {operation: "loadCustomPreset", presetIndex: preflightingSoundPreset, settings: presetPreflightSettings}});
		preflightingSoundPreset = null;
	}
}

function applySoundPresetWithName(presetName) {
	sendToProduct({header: "dsp", content: {operation: "loadCustomPreset", presetName: presetName}});
}


// BOX DIMENSION SETUP

function selectBoxVariant(boxVariant) {
	
	switch (boxVariant) {
		case 0:
			principle = "two-way";
			$("#box-visualiser img").attr("src", "dim-"+principle+".png");
			break;
		case 1:
			principle = "three-way";
			setTimeout(function() {
				$("#box-visualiser img").attr("src", "dim-"+principle+".png");
			}, 500);
			break;
	}
	$("#box-selector > div").removeClass("selected");
	$("#box-selector-item-"+boxVariant).addClass("selected");
	$("#box-visualiser").removeClass("two-way three-way").addClass(principle);
	
}



var pixelScaleFactor = 3;


var wallDimensionsMillimetres = [1000, 1000];
var wallDimensionsCentimetres = [100, 100];
var wallDimensionsPixels = [333, 333];

var pegboard = false;

function togglePegboard() {
	if (!pegboard) {
		$("#pegboard-toggle").addClass("on");
		pegboard = true;
	} else {
		$("#pegboard-toggle").removeClass("on");
		pegboard = false;
	}
}

$(".dimension-slider.wall").slider({
	range: false,
	min: 100,
	max: 420,
	value: 0,
	slide: function( event, ui ) {
	        
		if ($(event.target).hasClass("wall-width")) {
			modifyWallDimensions(ui.value, "slider");
		}
		if ($(event.target).hasClass("wall-height")) {
			modifyWallDimensions(ui.value, "slider");
		}
			
	},
	start: function(event, ui) {
	
		if ($(event.target).hasClass("wall-width")) {
			wallDimensionDragDirectionHorizontal = true;
		}
		if ($(event.target).hasClass("wall-height")) {
			wallDimensionDragDirectionHorizontal = false;
		}
	},
	stop: function(event, ui) {
		
	}
});

function modifyWallDimensions(value, source) {
	if (wallDimensionDragDirectionHorizontal) {
		if (source == "visualiser") {
		
		} else {
			wallDimensionsCentimetres[0] = value;
			wallDimensionsMillimetres[0] = value*10;
			wallDimensionsPixels[0] = Math.round(value*10/pixelScaleFactor);
		}
	} else {
		if (source == "visualiser") {
		
		} else {
			wallDimensionsCentimetres[1] = value;
			wallDimensionsMillimetres[1] = value*10;
			wallDimensionsPixels[1] = Math.round(value*10/pixelScaleFactor);
		}
	}
	
	$("#wall-dimension-control").css("width", wallDimensionsPixels[0]+"px");
	$("#wall-dimension-control").css("height", wallDimensionsPixels[1]+"px");
	
	$("#wall-height .value").text(wallDimensionsCentimetres[1]);
	$("#wall-width .value").text(wallDimensionsCentimetres[0]);
}



var boxDimensionDragDirectionHorizontal = false;
var boxDimensionsPixels = [105,105];
var boxDimensionGrilleSnap = 4;
var boxDimensionDragLastPosition = null;


var boxDimensionsMillimetres = [315,315];
var boxDimensionsCentimetres = [32,32];
var boxDepthMillimetres = 50;
var boxVolumeLimitsLitres = [5, 10];


$(".dimension-slider.speaker").slider({
	range: false,
	min: 0,
	max: 100,
	value: 32,
	slide: function( event, ui ) {
	        
		modifyBoxDimensions(ui.value, "slider");
			
	},
	start: function(event, ui) {
	
		if ($(event.target).hasClass("speaker-width")) {
			boxDimensionDragDirectionHorizontal = true;
		}
		if ($(event.target).hasClass("speaker-height")) {
			boxDimensionDragDirectionHorizontal = false;
		}
	},
	stop: function(event, ui) {
	
		finishModifyingBoxDimensions(ui.value, "slider");
	}
});

$( ".dimension-box .dimension-handle" ).draggable({
	cursorAt: { top: 0, left: 0 },
	scroll: false,
	helper: function( event ) {
	return $( "<div class='ui-widget-header' style='display: none;'>I'm a custom helper</div>" );
	},
	start: function( event, ui ) {
			boxDimensionDragDirectionHorizontal = $(event.target).hasClass("width");
	
	},
	stop: function( event, ui ) {
		if (boxDimensionDragDirectionHorizontal) {
				finishModifyingBoxDimensions(ui.offset.left, "visualiser");
			} else {
				finishModifyingBoxDimensions(ui.offset.top, "visualiser");
			}
	},
	drag: function( event, ui ) {
	
		if (boxDimensionDragLastPosition) {
			
			if (boxDimensionDragDirectionHorizontal) {
				modifyBoxDimensions(ui.offset.left, "visualiser");
			} else {
				modifyBoxDimensions(ui.offset.top, "visualiser");
			}
			
			boxDimensionDragLastPosition = ui.position;
			
			
		} else {
			boxDimensionDragLastPosition = ui.position;
		}
	}
});


function modifyBoxDimensions(value, source) {

	
	if (boxDimensionDragDirectionHorizontal) {
		if (source == "visualiser") {
			boxDimensionsPixels[0] += (value-boxDimensionDragLastPosition.left);
			
			boxDimensionsMillimetres[0] = Math.round(boxDimensionsPixels[0])*pixelScaleFactor;
			boxDimensionsCentimetres[0] = Math.round(boxDimensionsMillimetres[0]/10);
			$(".dimension-slider.speaker-width").slider("value", boxDimensionsCentimetres[0]);
		} else {
			boxDimensionsCentimetres[0] = value;
			boxDimensionsMillimetres[0] = boxDimensionsCentimetres[0]*10;
			boxDimensionsPixels[0] = Math.round(boxDimensionsMillimetres[0]/pixelScaleFactor);
			
		}
		
		$(".dimension-box").css("width", boxDimensionsPixels[0]+"px");
		
		newHeight = calculateAndLimitBoxVolume(boxDimensionsMillimetres[0], boxDimensionsMillimetres[1]);
		if (newHeight != null) {
			boxDimensionsMillimetres[1] = newHeight;
			boxDimensionsPixels[1] = boxDimensionsMillimetres[1]/pixelScaleFactor;
			$(".dimension-box").css("height", calculateBoxGrilleSnap(boxDimensionsMillimetres[1]/pixelScaleFactor)+"px");
			boxDimensionsCentimetres[1] = Math.round(boxDimensionsMillimetres[1]/10);
			$(".dimension-slider.speaker-height").slider("value", boxDimensionsCentimetres[1]);
			
		}
	} else {
		if (source == "visualiser") {
			boxDimensionsPixels[1] += (value-boxDimensionDragLastPosition.top);
			
			boxDimensionsMillimetres[1] = Math.round(boxDimensionsPixels[1])*pixelScaleFactor;
			boxDimensionsCentimetres[1] = Math.round(boxDimensionsMillimetres[1]/10);
			$(".dimension-slider.speaker-height").slider("value", boxDimensionsCentimetres[1]);
		} else {
			boxDimensionsCentimetres[1] = value;
			boxDimensionsMillimetres[1] = boxDimensionsCentimetres[1]*10;
			boxDimensionsPixels[1] = Math.round(boxDimensionsMillimetres[1]/pixelScaleFactor);
		}
		
		$(".dimension-box").css("height", boxDimensionsPixels[1]+"px");
		
		newWidth = calculateAndLimitBoxVolume(boxDimensionsMillimetres[1], boxDimensionsMillimetres[0]);
		if (newWidth != null) {
			boxDimensionsMillimetres[0] = newWidth;
			boxDimensionsPixels[0] = boxDimensionsMillimetres[0]/pixelScaleFactor;
			$(".dimension-box").css("width", calculateBoxGrilleSnap(boxDimensionsMillimetres[0]/pixelScaleFactor)+"px");
			boxDimensionsCentimetres[0] = Math.round(boxDimensionsMillimetres[0]/10);
			$(".dimension-slider.speaker-width").slider("value", boxDimensionsCentimetres[0]);
		}
	}
	
	$("#speaker-height-control-square .value").text(boxDimensionsCentimetres[1]);
	$("#speaker-width-control-square .value").text(boxDimensionsCentimetres[0]);
	
	if (boxDimensionsCentimetres[0] == boxDimensionsCentimetres[1]) {
		$(".dimension-dot-pattern").addClass("circular");
	} else {
		$(".dimension-dot-pattern").removeClass("circular");
	}
	
	
}

function finishModifyingBoxDimensions(value, source) {
	if (boxDimensionDragDirectionHorizontal) {
		if (source == "visualiser") {
			newRawDimension = boxDimensionsPixels[0]+(value-boxDimensionDragLastPosition.left);
		} else {
			boxDimensionsCentimetres[0] = value;
			boxDimensionsMillimetres[0] = boxDimensionsCentimetres[0]*10;
			newRawDimension = Math.round(boxDimensionsMillimetres[0]/pixelScaleFactor);
		}
		boxDimensionsPixels[0] = newRawDimension;
		newSnapDimension = calculateBoxGrilleSnap(newRawDimension);
		$(".dimension-box").css("width", newSnapDimension+"px");
	} else {
		if (source == "visualiser") {
			newRawDimension = boxDimensionsPixels[1]+(value-boxDimensionDragLastPosition.top);
		} else {
			boxDimensionsCentimetres[1] = value;
			boxDimensionsMillimetres[1] = boxDimensionsCentimetres[1]*10;
			newRawDimension = Math.round(boxDimensionsMillimetres[1]/pixelScaleFactor);
		}
		boxDimensionsPixels[1] = newRawDimension;
		newSnapDimension = calculateBoxGrilleSnap(newRawDimension);
		$(".dimension-box").css("height", newSnapDimension+"px");
	}
	boxDimensionDragLastPosition = null;
}


function calculateBoxGrilleSnap(rawDimension) {
	divRemainder = (rawDimension-1) % boxDimensionGrilleSnap;
	//console.log("Raw: "+rawDimension+" Remainder: "+divRemainder);
	if (divRemainder < boxDimensionGrilleSnap - divRemainder) {
		snapDimension = rawDimension-divRemainder;
	} else {
		snapDimension = rawDimension+(boxDimensionGrilleSnap-divRemainder);
	}
	return snapDimension;
}


function calculateAndLimitBoxVolume(adjustment, static) {
	//console.log(adjustment, static);
	// Adjustment is the currently adjusted dimension, static is the non-adjusted dimension.
	boxVolumeCubicMillimetres = (adjustment*static*boxDepthMillimetres);
	newStaticDimension = null;
	if (boxVolumeCubicMillimetres < boxVolumeLimitsLitres[0]*1000000) {
		// Enclosure is smaller than limit, start increasing the other dimension.
		newStaticDimension = boxVolumeLimitsLitres[0]*1000000/(adjustment*boxDepthMillimetres);
		$("#speaker-volume-control-square .value").text(boxVolumeLimitsLitres[0]);
	} else if (boxVolumeCubicMillimetres > boxVolumeLimitsLitres[1]*1000000) {
		// Enclosure is larger than limit, start reducing the other dimension.
		newStaticDimension = boxVolumeLimitsLitres[1]*1000000/(adjustment*boxDepthMillimetres);
		$("#speaker-volume-control-square .value").text(boxVolumeLimitsLitres[1]);
	} else {
		$("#speaker-volume-control-square .value").text(Math.round(boxVolumeCubicMillimetres/100000)/10);
	}
	return newStaticDimension;
}


/*
var boxDimensionDragDirectionHorizontal = false;
var boxDimensionsPixels = [102,102];
var boxDimensionDragScaleFactor = 3;
var boxDimensionGrilleSnap = 4;
var boxDimensionDragStartPosition = null;


var boxDimensionsMillimetres = [317,317];
var boxDepthMillimetres = 50;
var boxVolumeLimitsLitres = [5, 10];

$( ".dimension-box .dimension-handle" ).draggable({
	cursorAt: { top: 0, left: 0 },
	scroll: false,
	helper: function( event ) {
	return $( "<div class='ui-widget-header' style='display: none;'>I'm a custom helper</div>" );
	},
	start: function( event, ui ) {
			boxDimensionDragDirectionHorizontal = $(event.target).hasClass("width");
	
	},
	stop: function( event, ui ) {
		if (boxDimensionDragDirectionHorizontal) {
			newRawDimension = boxDimensionsPixels[0]+(ui.offset.left-boxDimensionDragStartPosition.left);
			boxDimensionsPixels[0] = newRawDimension;
			newSnapDimension = calculateBoxGrilleSnap(newRawDimension);
			$(".dimension-box").css("width", newSnapDimension+"px");
		} else {
			newRawDimension = boxDimensionsPixels[1]+(ui.offset.top-boxDimensionDragStartPosition.top);
			boxDimensionsPixels[1] = newRawDimension;
			newSnapDimension = calculateBoxGrilleSnap(newRawDimension);
			$(".dimension-box").css("height", newSnapDimension+"px");
		}
		boxDimensionDragStartPosition = null;
	},
	drag: function( event, ui ) {
	
		if (boxDimensionDragStartPosition) {
			//console.log(boxDimensionDragStartPosition);
			if (boxDimensionDragDirectionHorizontal) {
				$(".dimension-box").css("width", boxDimensionsPixels[0]+(ui.offset.left-boxDimensionDragStartPosition.left)+"px");
				boxDimensionsMillimetres[0] = Math.round(boxDimensionsPixels[0]+(ui.offset.left-boxDimensionDragStartPosition.left))*boxDimensionDragScaleFactor;
				$("#speaker-width-control-square .value").text(boxDimensionsMillimetres[0]/10);
				
				newHeight = calculateAndLimitBoxVolume(boxDimensionsMillimetres[0], boxDimensionsMillimetres[1]);
				if (newHeight != null) {
					boxDimensionsMillimetres[1] = newHeight;
					boxDimensionsPixels[1] = boxDimensionsMillimetres[1]/boxDimensionDragScaleFactor;
					$(".dimension-box").css("height", calculateBoxGrilleSnap(boxDimensionsMillimetres[1]/boxDimensionDragScaleFactor)+"px");
					$("#speaker-height-control-square .value").text(Math.round(boxDimensionsMillimetres[1])/10);
				}
			} else {
				$(".dimension-box").css("height", boxDimensionsPixels[1]+(ui.offset.top-boxDimensionDragStartPosition.top)+"px");
				boxDimensionsMillimetres[1] = Math.round(boxDimensionsPixels[1]+(ui.offset.top-boxDimensionDragStartPosition.top))*boxDimensionDragScaleFactor;
				$("#speaker-height-control-square .value").text(boxDimensionsMillimetres[1]/10);
				
				newWidth = calculateAndLimitBoxVolume(boxDimensionsMillimetres[1], boxDimensionsMillimetres[0]);
				if (newWidth != null) {
					boxDimensionsMillimetres[0] = newWidth;
					boxDimensionsPixels[0] = boxDimensionsMillimetres[0]/boxDimensionDragScaleFactor;
					$(".dimension-box").css("width", calculateBoxGrilleSnap(boxDimensionsMillimetres[0]/boxDimensionDragScaleFactor)+"px");
					$("#speaker-width-control-square .value").text(Math.round(boxDimensionsMillimetres[0])/10);
				}
			}
			
		} else {
			boxDimensionDragStartPosition = ui.position;
		}
	}
});

function calculateBoxGrilleSnap(rawDimension) {
	divRemainder = (rawDimension-2) % boxDimensionGrilleSnap;
	//console.log("Raw: "+rawDimension+" Remainder: "+divRemainder);
	if (divRemainder < boxDimensionGrilleSnap - divRemainder) {
		snapDimension = rawDimension-divRemainder;
	} else {
		snapDimension = rawDimension+(boxDimensionGrilleSnap-divRemainder);
	}
	return snapDimension;
}


function calculateAndLimitBoxVolume(adjustment, static) {
	//console.log(adjustment, static);
	// Adjustment is the currently adjusted dimension, static is the non-adjusted dimension.
	boxVolumeCubicMillimetres = (adjustment*static*boxDepthMillimetres);
	newStaticDimension = null;
	if (boxVolumeCubicMillimetres < boxVolumeLimitsLitres[0]*1000000) {
		// Enclosure is smaller than limit, start increasing the other dimension.
		newStaticDimension = boxVolumeLimitsLitres[0]*1000000/(adjustment*boxDepthMillimetres);
		$("#speaker-volume-control-square .value").text(boxVolumeLimitsLitres[0]);
	} else if (boxVolumeCubicMillimetres > boxVolumeLimitsLitres[1]*1000000) {
		// Enclosure is larger than limit, start reducing the other dimension.
		newStaticDimension = boxVolumeLimitsLitres[1]*1000000/(adjustment*boxDepthMillimetres);
		$("#speaker-volume-control-square .value").text(boxVolumeLimitsLitres[1]);
	} else {
		$("#speaker-volume-control-square .value").text(Math.round(boxVolumeCubicMillimetres/100000)/10);
	}
	return newStaticDimension;
}


*/





// TYPE & ROLE
// Sets up "best-guess" crossovers for the drivers based on their type.

function speakerSetupMode(mode) {
	$("#speaker-setup-titles h2").addClass("hidden");
	$("#speaker-role-tabs div").removeClass("selected");
	$("#speaker-setup-container").removeClass("type role levels more");
	switch (mode) {
		case 0:
			$("#speaker-role-type-tab").addClass("selected");
			$("#speaker-setup-type-title").removeClass("hidden");
			$("#speaker-setup-container").addClass("type");
			break;
		case 1:
			$("#speaker-role-role-tab").addClass("selected");
			$("#speaker-setup-role-title").removeClass("hidden");
			$("#speaker-setup-container").addClass("role");
			break;
		case 2:
			$("#speaker-role-levels-tab").addClass("selected");
			$("#speaker-setup-levels-title").removeClass("hidden");
			$("#speaker-setup-container").addClass("levels");
			break;
		case 3:
			$("#speaker-role-more-tab").addClass("selected");
			$("#speaker-setup-more-title").removeClass("hidden");
			$("#speaker-setup-container").addClass("more");
			break;
			
	}

}

var speakerTypeSequence = ["full-range", "tweeter", "mid-tweeter", "midrange", "mid-woofer", "woofer"];

function advanceSpeakerType(channel) {
	if (channels[channel].type) {
		index = speakerTypeSequence.indexOf(channels[channel].type);
		index++;
		if (index == speakerTypeSequence.length) index = 0;
	} else {
		index = 0;
	}
	newType = speakerTypeSequence[index];
	channels[channel].type = newType;
	
	typeUI = getSpeakerTypeNameAndIcon(newType);
	
	$("#speaker-type-channel-"+channel+" .speaker-driver-img").attr("src", "drivers/"+typeUI[1]+".png");
	$("#speaker-type-channel-"+channel+" .speaker-type-label").text(typeUI[0]);
}

function showSpeakerTypeSheet(channel) {
	ask("speaker-type-ask-menu", [channelString[channel].toUpperCase()]);
}

function loadSpeakerSetup() {
	if (channels) {
		for (var c = 0; c < channels.length; c++) {
			// Types
			type = channels[c].type;
			typeUI = getSpeakerTypeNameAndIcon(type);
	
			$("#speaker-type-channel-"+c+" .speaker-driver-img").attr("src", "drivers/"+typeUI[1]+".png");
			$("#speaker-type-channel-"+c+" .speaker-type-label").text(typeUI[0]);
		
			// Roles
			switch (channels[c].role) {
				case "left":
					roleCharacter = "L";
					break;
				case "right":
					roleCharacter = "R";
					break;
				case "mono":
					roleCharacter = "M";
					break;
			}
			$("#speaker-type-channel-"+c+" .speaker-role-label").text(roleCharacter);
			$("#speaker-type-channel-"+c+" .speaker-role-selector div").removeClass("selected");
			$("#speaker-type-channel-"+c+" .speaker-role-selector .role-"+roleCharacter.toLowerCase()).addClass("selected");
			
			// Mute state
			
			if (channels[c].mute == true) {
				$("#speaker-type-channel-"+c+" .speaker-enabled img").attr("src", "symbols-black/volume-mute.svg").removeClass("selected");
			} else {
				$("#speaker-type-channel-"+c+" .speaker-enabled img").attr("src", "symbols-black/volume.svg").addClass("selected");
			}
		}
	}
}

function getSpeakerTypeNameAndIcon(type) {
	switch (type) {
		case "full-range":
			newTypeUI = "Full-range";
			newTypeIcon = "mid-full";
			hp = null;
			lp = null;
			break;
		case "tweeter":
			newTypeUI = "Tweeter";
			newTypeIcon = "tweet";
			hp = 2300;
			lp = null;
			break;
		case "mid-tweeter":
			newTypeUI = "Mid-tweeter";
			newTypeIcon = "mid-full";
			hp = 300;
			lp = null;
			break;
		case "midrange":
			newTypeUI = "Midrange";
			newTypeIcon = "mid-full";
			hp = 300;
			lp = 2300;
			break;
		case "mid-woofer":
			newTypeUI = "Mid-woofer";
			newTypeIcon = "woof";
			hp = null;
			lp = 2300;
			break;
		case "woofer":
			newTypeUI = "Woofer";
			newTypeIcon = "woof";
			hp = null;
			lp = 300;
			break;
	}
	return [newTypeUI, newTypeIcon, hp, lp];
}

function setSpeakerRole(channel, role) {
	switch (role) {
		case "left":
			roleCharacter = "L";
			break;
		case "right":
			roleCharacter = "R";
			break;
		case "mono":
			roleCharacter = "M";
			break;
	}
	channels[channel].role = role;
	$("#speaker-type-channel-"+channel+" .speaker-role-label").text(roleCharacter);
	$("#speaker-type-channel-"+channel+" .speaker-role-selector div").removeClass("selected");
	$("#speaker-type-channel-"+channel+" .speaker-role-selector .role-"+roleCharacter.toLowerCase()).addClass("selected");
	sendToProduct({header: "dsp", content: {operation: "setRole", channel: channel, role: role}});
}

function toggleMute(channel) {
	if (channels[channel].mute == false) {
		//$("#speaker-type-channel-"+channel+" .speaker-enabled img").attr("src", "symbols-black/volume-mute.svg").removeClass("selected");
		sendToProduct({header: "dsp", content: {operation: "setMute", channel: channel, mute: true}});
	} else {
		//$("#speaker-type-channel-"+channel+" .speaker-enabled img").attr("src", "symbols-black/volume.svg").addClass("selected");
		sendToProduct({header: "dsp", content: {operation: "setMute", channel: channel, mute: false}});
	}
}


$(".speaker-level-slider").slider({
	range: "min",
	min: 0,
	max: 100,
	value: 100,
	slide: function( event, ui ) {
	        //qValue = ui.value/25;
			//changeFilterProperty(selectedDSPChannel, selectedFilter, "Q", qValue);
		}
});
$(".speaker-level-slider span").attr("data-content", "100");


// TONETOUCH

var toneTouchDragStartPosition = null;
var toneTouchDragTopOffset = null;
var toneTouchAreaDimensions = [];
var toneTouchXY = [50,50];
var previousToneTouchXY = [];
var toneTouchOffLabelTimeout = null

$( "#tone-touch-dot" ).draggable({
//	cursorAt: { top: 0, left: 0 },
	//delay: 500,
	scroll: false,
	helper: function( event ) {
	return $( "<div class='ui-widget-header' style='display: none;'>I'm a custom helper</div>" );
	},
	start: function( event, ui ) {
		
	},
	stop: function( event, ui ) {
		console.log(previousToneTouchXY);
		
		if ((previousToneTouchXY[0] != 50 || previousToneTouchXY[1] != 50) && Math.distance(toneTouchXY[0], toneTouchXY[1], 50, 50) < 5) {
			// Snap to center
			$("#tone-touch-dot").css("left", "50%").css("top", "50%");
			toneTouchXY = [50,50];
			
			if (toneTouchDotDiameter == 50) {
				clearTimeout(toneTouchOffLabelTimeout);
				$("#tone-touch-dot span").text("Off");
				$("#tone-touch-dot").removeClass("number").addClass("text");
				toneTouchOffLabelTimeout = setTimeout(function() {
					$("#tone-touch-dot").removeClass("text");
				}, 2000);
			}
		}
		toneTouchDragStartPosition = null;
	},
	drag: function( event, ui ) {
		if (toneTouchDragStartPosition) {
			toneTouchXY[0] = (ui.position.left/toneTouchAreaDimensions[0])*100;
			toneTouchXY[1] = ((ui.position.top-toneTouchDragTopOffset)/toneTouchAreaDimensions[1])*100;
			//if (toneTouchXY[0] > 45 && toneTouchXY[0] < 55 && toneTouchXY[1] > 45 && toneTouchXY[1] < 55) {
			$("#tone-touch-dot").css("left", toneTouchXY[0]+"%").css("top", toneTouchXY[1]+"%");
		} else {
			previousToneTouchXY = toneTouchXY.slice(0);
			toneTouchDragStartPosition = ui.position;
			toneTouchDragTopOffset = $("#tone-touch-scroll-area").position().top;
			toneTouchAreaDimensions = [document.getElementById("tone-touch-area").offsetWidth, document.getElementById("tone-touch-area").offsetHeight];
		}
		
	}
});


var toneTouchGestureLastScale = 0;
var toneTouchDotDiameter = 50;
// ToneTouch spaciousness
function toneTouchGesture(stage, targetTouches) {
	switch (stage) {
		case 0: // End.
			if (toneTouchDotDiameter < 50 || toneTouchDotDiameter == 50) {
				toneTouchDotDiameter = 50;
				setToneTouchDotDiameter(50);
				if (toneTouchXY[0] == 50 && toneTouchXY[1] == 50) {
					$("#tone-touch-dot span").text("Off");
					$("#tone-touch-dot").removeClass("number").addClass("text");
				}
			} else if (toneTouchDotDiameter > 150) {
				setToneTouchDotDiameter(150);
				toneTouchDotDiameter = 150;
			}
			
			
			clearTimeout(toneTouchOffLabelTimeout);
			toneTouchOffLabelTimeout = setTimeout(function() {
				$("#tone-touch-dot").removeClass("text number");
			}, 2000);
			
			
			break;
		case 1:	// Start.
			clearTimeout(graphTooltipHideTimeout);
			toneTouchGestureLastScale = Math.distance(targetTouches[0].pageX,targetTouches[0].pageY,targetTouches[1].pageX,targetTouches[1].pageY);
			break;
		case 2: // Move.
			newScale = Math.distance(targetTouches[0].pageX,targetTouches[0].pageY,targetTouches[1].pageX,targetTouches[1].pageY);
			scaleDelta = (newScale-toneTouchGestureLastScale)*10;
			$("#tone-touch-dot").removeClass("text").addClass("number");
			
			if (toneTouchDotDiameter < 50) {
				toneTouchDotDiameter = toneTouchDotDiameter+scaleDelta/30;
				$("#tone-touch-dot span").text(0);
			} else if (toneTouchDotDiameter > 150) {
				toneTouchDotDiameter = toneTouchDotDiameter+scaleDelta/30;
				$("#tone-touch-dot span").text(10);
			} else {
				toneTouchDotDiameter = toneTouchDotDiameter+scaleDelta/10;
				$("#tone-touch-dot span").text(Math.ceil((toneTouchDotDiameter-50)/10));
			}
			setToneTouchDotDiameter(toneTouchDotDiameter);
			toneTouchGestureLastScale = newScale;
			//console.log(toneTouchDotDiameter);
			break;
	}
}

function setToneTouchDotDiameter(theDiameter) {
	$("#tone-touch-dot").css("width", theDiameter+"px").css("height", theDiameter+"px");
	$("#tone-touch-dot").css("margin-left", "-"+theDiameter/2+"px").css("margin-top", "-"+theDiameter/2+"px");
	$("#tone-touch-scale-area").css("left", -100+theDiameter/2+"px").css("top", -100+theDiameter/2+"px");
}


// MANUAL FILTER SETUP



function loadFilters() {
	resetGraphs(sampleRate);
	//console.log(channels);
	if (channels) {
		for (var c = 0; c < channels.length; c++) {
			if (channels[c].crossover.hp) {
				createFilter(c, 0, "hp", channels[c].crossover.hp, undefined, undefined, true);
				createFilter(c, 1, "hp", channels[c].crossover.hp, undefined, undefined, true);
				hpValue = channels[c].crossover.hp;
			} else {
				hpValue = 10;
			}
			if (channels[c].crossover.lp) {
				createFilter(c, 2, "lp", channels[c].crossover.lp, undefined, undefined, true);
				createFilter(c, 3, "lp", channels[c].crossover.lp, undefined, undefined, true);
				lpValue = channels[c].crossover.lp;
			} else {
				lpValue = 20000;
			}
			if (channels[c].invert) {
				$("#invert-selector-item-"+c).addClass("selected");
			} else {
				$("#invert-selector-item-"+c).removeClass("selected");
			}
			updateCrossoverSliderLabels(c, hpValue, lpValue);
			$("#crossover-slider-"+c).slider("values", 0, convertHz(hpValue, "linear"));
			$("#crossover-slider-"+c).slider("values", 1, convertHz(lpValue, "linear"));
			
			for (var f = 0; f < channels[c].filters.length; f++) {
				if (channels[c].filters[f].enabled) {
					createFilter(c, f+4, "peak", channels[c].filters[f].Fc, channels[c].filters[f].boost, channels[c].filters[f].Q, channels[c].filters[f].enabled);
				}
			}
		}
		if (selectedDSPChannel != null) {
			drawPhaseResponse(selectedDSPChannel);
			selectFilter(selectedFilter, true);
		} else {
			drawPhaseResponse();
			drawMagnitudeResponse();
		}
	} else {
		loadTestGraphs();
	}
}

// SELECT CHANNEL

var selectedDSPChannel = null;
var channelString = "abcd";
function selectDSPChannel(channel) {
	if (channel != undefined) {
		if (selectedDSPChannel == null) {
			$("#graph-hint").addClass("visible");
			setTimeout(function() {
				$("#graph-hint").removeClass("visible");
			}, 500);
		}
		selectedDSPChannel = channel;
		$("#dsp-channel-select div").removeClass("selected");
		$("#dsp-ch-"+channelString[channel]).addClass("selected");
		$("#filter-selector, .filter-slider").removeClass("red yellow green blue").addClass(channelColourNames[channel]);
		selectScreenTab('dsp-screen-tabs', 'dsp-single-tab');
		$("#dsp-channel-header span").text("Channel "+channelString[channel].toUpperCase());
		$(".speaker-terminal-guide").removeClass("show-a show-b show-c show-d");
		$(".speaker-terminal-guide").addClass("show-"+channelString[channel]);
		drawPhaseResponse(channel);
		//drawMagnitudeResponse(channel, selectedFilter);
		selectFilter(selectedFilter, true);
		
		if (channels) {
			for (var i = 0; i < channels[selectedDSPChannel].filters.length; i++) {
				$("#filter-selector-item-"+i+" .filter-value").text(channels[selectedDSPChannel].filters[i].Fc);
				if (channels[selectedDSPChannel].filters[i].enabled != true) {
					$("#filter-selector-item-"+i).addClass("disabled");
				} else {
					$("#filter-selector-item-"+i).removeClass("disabled");
				}
			}
		}
		$("#graph-filter-peak-dot").removeClass("red yellow green blue").addClass("visible "+channelColourNames[channel]);
		$("#dsp-graph").addClass("interactive");
		
		
	} else {
		selectedDSPChannel = null;
		$("#dsp-channel-select div").removeClass("selected");
		$("#graph-filter-peak-dot").removeClass("visible");
		selectScreenTab('dsp-screen-tabs', 'dsp-all-tab');
		$(".speaker-terminal-guide").addClass("show-a show-b show-c show-d");
		$("#dsp-ch-all").addClass("selected");
		$("#dsp-graph").removeClass("interactive");
		drawPhaseResponse();
		drawMagnitudeResponse();
	}
}




var dspGuideVisible = false;
function toggleSpeakerTerminalGuide() {
	if (dspGuideVisible) {
		//$("#dsp-graph").removeClass("show-guide");
		$("#dsp-guide").addClass("hidden");
		if (selectedDSPChannel != null) {
			$("#dsp-single").removeClass("hidden");
		} else {
			$("#dsp-all").removeClass("hidden");
		}
		dspGuideVisible = false;
	} else {
		$("#dsp-all, #dsp-single").addClass("hidden");
		$("#dsp-guide").removeClass("hidden");
		//$("#dsp-graph").addClass("show-guide");
		dspGuideVisible = true;
	}
	
}


// CROSSOVER

var filterDrawDelay = 20; // Change to make graph respond faster.
var filterDrawTimeout = null;
var filterSendDelay = 100; // Change to send filter parameters faster.
var filterSendTimeout = null;

var crossoverSnaps = [];
var nextSnapValue = null;
var lastRawSliderValues = [];
var snapExitThreshold = 10;
var sliderSnappedToValue = null;

$(".crossover-slider").slider({
	range: true,
	min: 0,
	max: 300,
	values: [ 0, 300 ],
	slide: function( event, ui ) {
	        
			if ($(event.target).hasClass("red")) sliderChannel = 0;
			if ($(event.target).hasClass("yellow")) sliderChannel = 1;
			if ($(event.target).hasClass("green")) sliderChannel = 2;
			if ($(event.target).hasClass("blue")) sliderChannel = 3;
			
			if (ui.values[0] != lastRawSliderValues[0]) {
				hpValue = convertHz(ui.values[0]);
				setCrossover(sliderChannel, "hp", hpValue, true);
			}
			if (ui.values[1] != lastRawSliderValues[1]) {
				lpValue = convertHz(ui.values[1]);
				setCrossover(sliderChannel, "lp", lpValue, true);
			}
			lastRawSliderValues = [ui.values[0], ui.values[1]];
		},
	start: function(event, ui) {
		if ($(event.target).hasClass("red")) sliderChannel = 0;
		if ($(event.target).hasClass("yellow")) sliderChannel = 1;
		if ($(event.target).hasClass("green")) sliderChannel = 2;
		if ($(event.target).hasClass("blue")) sliderChannel = 3;
		
		setCrossoverSnaps(sliderChannel);
		
		lastRawSliderValues = [ui.values[0], ui.values[1]];
		sliderSnappedToValue = false;
	},
	stop: function(event, ui) {
		if ($(event.target).hasClass("red")) sliderChannel = 0;
		if ($(event.target).hasClass("yellow")) sliderChannel = 1;
		if ($(event.target).hasClass("green")) sliderChannel = 2;
		if ($(event.target).hasClass("blue")) sliderChannel = 3;
		
		if (sliderSnappedToValue) {
			$("#crossover-slider-"+sliderChannel).slider("values", 0, convertHz(channels[sliderChannel].crossover.hp, "linear"));
			$("#crossover-slider-"+sliderChannel).slider("values", 1, convertHz(channels[sliderChannel].crossover.lp, "linear"));
		}
	}
});

function setCrossoverSnaps(channel) {
	crossoverSnaps = [];
	for (var i = 0; i < 4; i++) {
		if (i != channel) { // Don't add snap points for the channel being adjusted – the slider should snap to other sliders, not itself.
			if (channels[i].crossover.lp) {
				snapLPValue = channels[i].crossover.lp;
				//console.log("Snap value: "+snapValue);
				if (crossoverSnaps.indexOf(snapLPValue) == -1) {
					crossoverSnaps.push(snapLPValue);
				}
			}
			if (channels[i].crossover.hp) {
				snapHPValue = channels[i].crossover.hp;
				//console.log("Snap value: "+snapValue);
				if (crossoverSnaps.indexOf(snapHPValue) == -1) {
					crossoverSnaps.push(snapHPValue);
				}
			}
		}
	}
	crossoverSnaps.sort(function(a, b){return a-b});
}

function setCrossover(channel, property, values, snap) {
	switch (property) {
		case "values":
			hpValue = values[0];
			lpValue = values[1];
			break;
		case "lp":
			hpValue = channels[channel].crossover.hp;
			if (hpValue == null) hpValue = 10;
			lpValue = values;
			if (!snap) $("#crossover-slider-"+channel).slider("values", 1, convertHz(lpValue, "linear"));
			break;
		case "hp":
			lpValue = channels[channel].crossover.lp;
			if (lpValue == null) lpValue = 20000;
			hpValue = values;
			if (!snap) $("#crossover-slider-"+channel).slider("values", 0, convertHz(hpValue, "linear"));
			break;
	}
	
	if (snap) {
		// Get compare values.
		if (property == "hp") {
			sliderValue = lastRawSliderValues[0];
			lastSliderHz = convertHz(sliderValue);
			compareValue = hpValue;
		}
		if (property == "lp") {
			sliderValue = lastRawSliderValues[1];
			lastSliderHz = convertHz(sliderValue);
			compareValue = lpValue;
		}
		
		// Compare forwards or backwards?
		if (compareValue < lastSliderHz) {
			compareForward = false;
		} else if (compareValue > lastSliderHz) {
			compareForward = true;
		} else {
			compareForward = null;
		}
		
		// Find next larger/smaller snap value.
		if (compareForward != null || nextSnapValue == null) {
			snapValue = null;
			if (compareForward == true) {
				for (var i = 0; i < crossoverSnaps.length; i++) {
					if (crossoverSnaps[i] > compareValue) {
						snapValue = crossoverSnaps[i];
						break;
					}
				}
			} else if (compareForward == false) {
				for (var i = crossoverSnaps.length-1; i > -1; i--) {
					if (crossoverSnaps[i] < compareValue) {
						snapValue = crossoverSnaps[i];
						break;
					}
				}
			}
		}
		
		if (sliderSnappedToValue) {
			// Release snaps if the user has dragged far enough beyond the snap point.
			if (compareForward == true) {
				
				if (convertHz(compareValue, "linear") > convertHz(sliderSnappedToValue, "linear")+snapExitThreshold) {
					sliderSnappedToValue = null;
					//console.log("Release snap");
				}
			} else if (compareForward == false) {
				if (convertHz(compareValue, "linear") < convertHz(sliderSnappedToValue, "linear")-snapExitThreshold) {
					sliderSnappedToValue = null;
					//console.log("Release snap");
				}
			}
		} 
		if (nextSnapValue != snapValue) {
			// When the snap value changes, it means that we just went past a snap point or reversed slide direction. Check that we are close to the snap point and snap if true.
			sliderSnappedToValue = null;
			if (nextSnapValue != null) {
				if (compareForward == true) {
					if (compareValue >= nextSnapValue && convertHz(compareValue, "linear") < convertHz(nextSnapValue, "linear")+snapExitThreshold) {
						//console.log("Snap (forwards) to "+nextSnapValue);
						sliderSnappedToValue = nextSnapValue;
					}
				} else if (compareForward == false) {
					if (compareValue <= nextSnapValue && convertHz(compareValue, "linear") > convertHz(nextSnapValue, "linear")-snapExitThreshold) {
						//console.log("Snap (backwards) to "+nextSnapValue);
						sliderSnappedToValue = nextSnapValue;
					}
				}
			}
			nextSnapValue = snapValue;
			
		}
		// Correct the crossover value to the snap value.
		if (sliderSnappedToValue) {
			if (property == "hp") {
				hpValue = sliderSnappedToValue;
			}
			if (property == "lp") {
				lpValue = sliderSnappedToValue;
			}
		}
	}
	
	updateCrossoverSliderLabels(channel, hpValue, lpValue);
	
	
	if (hpValue > 10) {
		dspHPValue = hpValue;
	} else {
		dspHPValue = null;
	}
	
	if (lpValue < 20000) {
		dspLPValue = lpValue;
	} else {
		dspLPValue = null;
	}
	
	channels[channel].crossover.lp = lpValue;
	channels[channel].crossover.hp = hpValue;
			
	clearTimeout(filterDrawTimeout);
	filterDrawTimeout = setTimeout(function() {
	
		if (hpValue > 10) {
			createFilter(channel, 0, "hp", hpValue, undefined, undefined, true);
			createFilter(channel, 1, "hp", hpValue, undefined, undefined, true);
		} else {
			clearFilter(channel, 0);
			clearFilter(channel, 1);
		}
		
		if (lpValue < 20000) {
			createFilter(channel, 2, "lp", lpValue, undefined, undefined, true);
			createFilter(channel, 3, "lp", lpValue, undefined, undefined, true);
		} else {
			clearFilter(channel, 2);
			clearFilter(channel, 3);
		}
		
		drawMagnitudeResponse();
		drawPhaseResponse();
		
	}, filterDrawDelay);
	
	clearTimeout(filterSendTimeout);
	filterSendTimeout = setTimeout(function() {
		
		// Send to DSP
		sendToProduct({header: "dsp", content: {operation: "setCrossover", channel: channel, hp: dspHPValue, lp: dspLPValue}});
		
	}, filterSendDelay);
}

function updateCrossoverSliderLabels(channel, hp, lp) {
//console.log("Updating slider values");
	if (hpValue > 10) {
		//$(".low-hz").text(hpValue);
		/*if (hpValue > 9999) {
			$("#crossover-slider-"+channel+" span:first-of-type").attr("data-content", hpValue+" Hz");
		} else {*/
			$("#crossover-slider-"+channel+" span:first-of-type").attr("data-content", hpValue+" Hz");
		//}
	} else {
		//$(".low-hz").text("∞");
		$("#crossover-slider-"+channel+" span:first-of-type").attr("data-content", "");
	}
	
	if (lpValue < 20000) {
		//$(".high-hz").text(lpValue);
		/*if (lpValue > 9999) {
			$("#crossover-slider-"+channel+" span:last-of-type").attr("data-content", lpValue/1000+" kHz");
		} else {*/
			$("#crossover-slider-"+channel+" span:last-of-type").attr("data-content", lpValue+" Hz");
		//}
		
	} else {
		//$(".high-hz").text("∞");
		$("#crossover-slider-"+channel+" span:last-of-type").attr("data-content", "");
	}
}

function startCrossoverFineAdjustment(channel, filter) {

	if (filter == 0) {
		startValue = channels[channel].crossover.hp;
		if (startValue == null) startValue = 10;
		fineAdjust(100, 10, 1, 
						10, 20000,
		startValue,
		function(newValue) {
			setCrossover(channel, "hp", newValue);
		}, 
		'Hz',
		'Channel '+channelString[channel].toUpperCase()+' High-Pass',
		false,
		10);
	} else {
		startValue = channels[channel].crossover.lp;
		if (startValue == null) startValue = 20000;
		fineAdjust(100, 10, 1, 
						10, 20000,
		startValue,
		function(newValue) {
			setCrossover(channel, "lp", newValue);
		}, 
		'Hz',
		'Channel '+channelString[channel].toUpperCase()+' Low-Pass',
		false,
		20000);
	}
}


function invertChannel(channel) {
	if (channels[channel].invert) {
		invertBool = false;
		$(".invert-channel-"+channel).removeClass("selected");
	} else {
		invertBool = true;
		$(".invert-channel-"+channel).addClass("selected");
	}
	
	channels[channel].invert = invertBool;
	sendToProduct({header: "dsp", content: {operation: "setInvert", channel: channel, invert: invertBool}});
	generateMasterGraphs(channel);
	drawPhaseResponse();
}


// INDIVIDUAL FILTERS

var selectedFilter = 4;
var filterCenterLinearOffset = 0;

function selectFilter(index, ignoreToggle) {
	$("#filter-selector > div").removeClass("selected");
	trueIndex = index - 4;
	$("#filter-selector-item-"+trueIndex).addClass("selected");
	if (index == selectedFilter && !ignoreToggle) {
		
		if (channels[selectedDSPChannel].filters[trueIndex].enabled == true) {
			changeFilterProperty(selectedDSPChannel, selectedFilter, "enabled", false);
			console.log("Filter disabled");
		} else {
			changeFilterProperty(selectedDSPChannel, selectedFilter, "enabled", true);
			console.log("Filter enabled");
		}
	} else {
		drawMagnitudeResponse(selectedDSPChannel, index);
		selectedFilter = index;
		$("#filter-slider-hz").slider("value", convertHz(channels[selectedDSPChannel].filters[selectedFilter-4].Fc, "linear"));
		filterCenterLinearOffset = convertHz(channels[selectedDSPChannel].filters[selectedFilter-4].Fc, "linear", windowWidth);
		$("#graph-filter-peak-dot").css("left", (filterCenterLinearOffset/windowWidth)*100+"%").css("top", (50-(channels[selectedDSPChannel].filters[selectedFilter-4].boost/15)*50)+"%");
		$("#filter-slider-hz span").attr("data-content", channels[selectedDSPChannel].filters[selectedFilter-4].Fc+" Hz");
		$("#filter-selector-item-"+(selectedFilter-4)+" .filter-value").text(channels[selectedDSPChannel].filters[selectedFilter-4].Fc);
		$("#filter-fc-control-square .value").text(channels[selectedDSPChannel].filters[selectedFilter-4].Fc);
		
		$("#filter-slider-boost").slider("value", channels[selectedDSPChannel].filters[selectedFilter-4].boost*10);
		$("#filter-slider-boost span").attr("data-content", channels[selectedDSPChannel].filters[selectedFilter-4].boost+" dB");
		$("#filter-boost-control-square .value").text(channels[selectedDSPChannel].filters[selectedFilter-4].boost);
		
		$("#filter-slider-q").slider("value", channels[selectedDSPChannel].filters[selectedFilter-4].Q*25);
		$("#filter-slider-q span").attr("data-content", "Q "+ channels[selectedDSPChannel].filters[selectedFilter-4].Q);
		$("#filter-q-control-square .value").text(channels[selectedDSPChannel].filters[selectedFilter-4].Q);
		
		if (channels[selectedDSPChannel].filters[selectedFilter-4].enabled != true) {
			$("#filter-selector-item-"+(selectedFilter-4)).addClass("disabled");
		} else {
			$("#filter-selector-item-"+(selectedFilter-4)).removeClass("disabled");
		}
	}
	
	
	
}

$("#filter-slider-hz").slider({
	range: false,
	min: 0,
	max: 300,
	value: 182,
	slide: function( event, ui ) {
	        
			hzValue = convertHz(ui.value);
			changeFilterProperty(selectedDSPChannel, selectedFilter, "Fc", hzValue);
		}
});
$("#filter-slider-hz span").attr("data-content", "1000 Hz");

$("#filter-slider-boost").slider({
	range: false,
	min: -150,
	max: 150,
	value: 0,
	slide: function( event, ui ) {
	        boostValue = ui.value/10;
			changeFilterProperty(selectedDSPChannel, selectedFilter, "boost", boostValue);
		}
});
$("#filter-slider-boost span").attr("data-content", "0 dB");

$("#filter-slider-q").slider({
	range: false,
	min: 1,
	max: 150,
	value: 7,
	slide: function( event, ui ) {
	        qValue = ui.value/25;
			changeFilterProperty(selectedDSPChannel, selectedFilter, "Q", qValue);
		}
});
$("#filter-slider-q span").attr("data-content", "Q 0");

function changeFilterProperty(channel, filter, property, value) {
	switch (property) {
		case "Fc":
			channels[channel].filters[filter-4].Fc = value;
			$("#filter-slider-hz span").attr("data-content", value+" Hz");
			$("#graph-tooltip-hz span").text(value);
			$("#filter-fc-control-square .value").text(value);
			$("#filter-selector-item-"+(filter-4)+" .filter-value").text(value);
			filterCenterLinearOffset = convertHz(value, "linear", windowWidth);
			$("#graph-filter-peak-dot").css("left", (filterCenterLinearOffset/windowWidth)*100+"%").css("top", (50-(channels[selectedDSPChannel].filters[selectedFilter-4].boost/15)*50)+"%");
			break;
		case "Q":
			channels[channel].filters[filter-4].Q = value;
			$("#filter-slider-q span").attr("data-content", "Q "+value);
			$("#graph-tooltip-q span").text(value);
			$("#filter-q-control-square .value").text(value);
			break;
		case "boost":
			channels[channel].filters[filter-4].boost = value;
			$("#filter-slider-boost span").attr("data-content", value+" dB");
			$("#filter-boost-control-square .value").text(value);
			$("#graph-tooltip-boost span").text(value);
			$("#graph-filter-peak-dot").css("left", (filterCenterLinearOffset/windowWidth)*100+"%").css("top", (50-(channels[selectedDSPChannel].filters[selectedFilter-4].boost/15)*50)+"%");
			break;
		case "gain":
			channels[channel].filters[filter-4].gain = value;
			break;
		case "enabled":
			channels[channel].filters[filter-4].enabled = value;
			if (value != true) {
				$("#filter-selector-item-"+(filter-4)).addClass("disabled");
			} else {
				$("#filter-selector-item-"+(filter-4)).removeClass("disabled");
			}
			break;
	}
	
	clearTimeout(filterSendTimeout);
	filterSendTimeout = setTimeout(function() {
		sendFilterToProduct(selectedDSPChannel, filter-4);
	}, filterSendDelay);
	
	clearTimeout(filterDrawTimeout);
	filterDrawTimeout = setTimeout(function() {
		createFilter(channel, filter, "peak", channels[channel].filters[filter-4].Fc, channels[channel].filters[filter-4].boost, channels[channel].filters[filter-4].Q, channels[channel].filters[filter-4].enabled);
		drawMagnitudeResponse(selectedDSPChannel, filter);
		drawPhaseResponse(selectedDSPChannel);
	}, filterDrawDelay);
	//console.log("Changed filter "+(filter-4)+" on channel "+channel);
}

function sendFilterToProduct(channel, filter) {
	sendToProduct({header: "dsp", content: {operation: "setFilter", channel: channel, filter: filter, Fc: channels[channel].filters[filter].Fc, boost: channels[channel].filters[filter].boost, Q: channels[channel].filters[filter].Q, gain: channels[channel].filters[filter].gain, enabled: channels[channel].filters[filter].enabled}});
}

function sendChannelFiltersToProduct(channel) {
	sendToProduct({header: "dsp", content: {operation: "setChannelFilters", channel: channel, filters: channels[channel].filters}});
}


// Drag graph to adjust filter center frequency and boost.
var graphDragLastPosition = null;
var graphDragLastValues = {Fc: 0, boost: 0};
var graphTooltipHideTimeout = null;
$( "#dsp-graph-container" ).draggable({
      cursor: "move",
      cursorAt: { top: 0, left: 0 },
      scroll: false,
      helper: function( event ) {
        return $( "<div class='ui-widget-header' style='display: none;'>I'm a custom helper</div>" );
      },
      start: function( event, ui ) {
  
	      //$("#filter-fc-control-square, #filter-boost-control-square").addClass(channelColourNames[selectedDSPChannel]);
      },
      stop: function( event, ui ) {
      	//console.log("Stop drag at", ui.position);
      	graphDragLastPosition = null;
      	//$("#filter-fc-control-square, #filter-boost-control-square").removeClass("red yellow green blue");
      	clearTimeout(graphTooltipHideTimeout);
      	graphTooltipHideTimeout = setTimeout(function() {
	      	$("#graph-tooltip").removeClass("visible");
      	}, 1000);
      },
      drag: function( event, ui ) {
      	if (graphDragLastPosition) {
      		clearTimeout(graphTooltipHideTimeout);
      		// Calculate drag delta.
	      	frequencyDelta = ui.position.left-graphDragLastPosition.left;
	      	filterCenterLinearOffset += (frequencyDelta);
	      	if (filterCenterLinearOffset > windowWidth) filterCenterLinearOffset = windowWidth;
	      	if (filterCenterLinearOffset < 0) filterCenterLinearOffset = 0;
	      	newFrequency = convertHz(filterCenterLinearOffset, false, windowWidth);
	      	if (graphDragLastValues.Fc != newFrequency) {
	      		if (newFrequency > 20000) newFrequency = 20000;
	      		if (newFrequency < 10) newFrequency = 10;
		      	//console.log(convertHz(filterCenterLinearOffset, false, 1000));
		      	changeFilterProperty(selectedDSPChannel, selectedFilter, "Fc", newFrequency);
		      	$("#filter-slider-hz").slider("value", convertHz(channels[selectedDSPChannel].filters[selectedFilter-4].Fc, "linear"));
		      	graphDragLastValues.Fc = newFrequency;
	      	}
	      	
	      	boostDelta = ui.position.top-graphDragLastPosition.top;
	      	
	      	newBoost = channels[selectedDSPChannel].filters[selectedFilter-4].boost*10 - boostDelta; // Calculate with integers to avoid rounding errors. Divide later to correct scale.
	      	if (graphDragLastValues.boost != newBoost) {
	      		if (newBoost < -150) newBoost = -150;
	      		if (newBoost > 150) newBoost = 150;
	      		changeFilterProperty(selectedDSPChannel, selectedFilter, "boost", newBoost/10);
	      		$("#filter-slider-boost").slider("value", channels[selectedDSPChannel].filters[selectedFilter-4].boost*10);
		      	graphDragLastValues.boost = newBoost;
	      	}
	      	
	      	$("#graph-tooltip").addClass("fc-boost visible").removeClass("q");
	      	$("#graph-tooltip").css("bottom", (50+(newBoost/150)*50)+"%").css("left", (filterCenterLinearOffset/windowWidth)*100+"%");
	      	if (filterCenterLinearOffset > windowWidth-40) {
      			$("#graph-tooltip").removeClass("left").addClass("right");
      		} else if (filterCenterLinearOffset < 40) {
      			$("#graph-tooltip").removeClass("right").addClass("left");
      			console.log("Left");
      		} else {
      			$("#graph-tooltip").removeClass("left right");
      		}
      	}
      	graphDragLastPosition = ui.position;
      }
    });
    
// Pinch with two fingers to adjust filter bandwidth.
var filterBandwidthGestureLastScale = 0;
var filterBandwidthGestureLastQ = 0;
function filterBandwidthGesture(stage, targetTouches) {
	switch (stage) {
		case 0: // End.
			//$("#filter-q-control-square").removeClass("red yellow green blue");
			clearTimeout(graphTooltipHideTimeout);
	      	graphTooltipHideTimeout = setTimeout(function() {
		      	$("#graph-tooltip").removeClass("visible");
	      	}, 1000);
			break;
		case 1:	// Start.
			clearTimeout(graphTooltipHideTimeout);
			filterBandwidthGestureLastScale = Math.distance(targetTouches[0].pageX,targetTouches[0].pageY,targetTouches[1].pageX,targetTouches[1].pageY);
			if (filterCenterLinearOffset > windowWidth-40) {
      			$("#graph-tooltip").removeClass("left").addClass("right");
      		} else if (filterCenterLinearOffset < 40) {
      			$("#graph-tooltip").removeClass("right").addClass("left");
      		} else {
      			$("#graph-tooltip").removeClass("left right");
      		}
			break;
		case 2: // Move.
			newScale = Math.distance(targetTouches[0].pageX,targetTouches[0].pageY,targetTouches[1].pageX,targetTouches[1].pageY);
			scaleDelta = (newScale-filterBandwidthGestureLastScale)*10;
			newQ = Math.round(channels[selectedDSPChannel].filters[selectedFilter-4].Q*100-scaleDelta/10);
			if (filterBandwidthGestureLastQ != newQ) {
				if (newQ < 1) newQ = 1;
				if (newQ > 600) newQ = 600;
	      		changeFilterProperty(selectedDSPChannel, selectedFilter, "Q", newQ/100);
	      		$("#filter-slider-q").slider("value", channels[selectedDSPChannel].filters[selectedFilter-4].Q*25);
	      		filterBandwidthGestureLastQ = newQ;
	      		//$("#filter-q-control-square").addClass(channelColourNames[selectedDSPChannel]);
	      		$("#graph-tooltip").addClass("q visible").removeClass("fc-boost");
	      		$("#graph-tooltip").css("bottom", 100+channels[selectedDSPChannel].filters[selectedFilter-4].boost*(20/3)+"px").css("left", filterCenterLinearOffset+"px");
	      		//console.log(newQ);
	      	}
			filterBandwidthGestureLastScale = newScale;
			
			break;
	}
}

var fineAdjustmentStartTimeout = null;
var fineAdjustmentStartDelay = 300;
function startFilterFineAdjustment(property, channel) {
	switch (property) {
		case "Fc":
			if (fineAdjustmentStartTimeout) {
				clearTimeout(fineAdjustmentStartTimeout);
				fineAdjustmentStartTimeout = null;
				roundFilterValue('Fc');
			} else {
				fineAdjustmentStartTimeout = setTimeout(function() {
					clearTimeout(fineAdjustmentStartTimeout);
					fineAdjustmentStartTimeout = null;
					fineAdjust(100, 10, 1, 
						10, 20000,
						channels[selectedDSPChannel].filters[selectedFilter-4].Fc, 
						function(newValue) {
							changeFilterProperty(selectedDSPChannel, selectedFilter, "Fc", newValue);
						},
						'Hz',
						'Center Frequency');
				}, fineAdjustmentStartDelay);
			}
			break;
		case "boost":
			if (fineAdjustmentStartTimeout) {
				clearTimeout(fineAdjustmentStartTimeout);
				fineAdjustmentStartTimeout = null;
				roundFilterValue('boost');
			} else {
				fineAdjustmentStartTimeout = setTimeout(function() {
					clearTimeout(fineAdjustmentStartTimeout);
					fineAdjustmentStartTimeout = null;
					fineAdjust(10, 1, 0.1, 
						-15, 15,
						channels[selectedDSPChannel].filters[selectedFilter-4].boost,
						function(newValue) {
							changeFilterProperty(selectedDSPChannel, selectedFilter, "boost", newValue);
						}, 
						'dB',
						'Gain');
				}, fineAdjustmentStartDelay);
			}
			break;
		case "Q":
			if (fineAdjustmentStartTimeout) {
				clearTimeout(fineAdjustmentStartTimeout);
				fineAdjustmentStartTimeout = null;
				roundFilterValue('Q');
			} else {
				fineAdjustmentStartTimeout = setTimeout(function() {
					clearTimeout(fineAdjustmentStartTimeout);
					fineAdjustmentStartTimeout = null;
					fineAdjust(1, 0.1, 0.01, 
						0.01, 10,
						channels[selectedDSPChannel].filters[selectedFilter-4].Q,
						function(newValue) {
							changeFilterProperty(selectedDSPChannel, selectedFilter, "Q", newValue);
						}, 
						'', 
						'Sharpness (Q)',
						false);
				}, fineAdjustmentStartDelay);
			}
			
			break;
		case "lp":
			break;
		case "hp":
			break;
	}
}

function roundFilterValue(property, channel) {
	switch (property) {
		case "Fc":
			value = channels[selectedDSPChannel].filters[selectedFilter-4].Fc;
			if (value > 9) newValue = Math.round(value/10)*10;
			if (value > 99) newValue = Math.round(value/100)*100;
	  		if (value > 999) newValue = Math.round(value/1000)*1000;
			changeFilterProperty(selectedDSPChannel, selectedFilter, "Fc", newValue);
			break;
		case "boost":
			value = channels[selectedDSPChannel].filters[selectedFilter-4].boost;
			newValue = Math.round(value);
			changeFilterProperty(selectedDSPChannel, selectedFilter, "boost", newValue);
			break;
		case "Q":
			value = channels[selectedDSPChannel].filters[selectedFilter-4].Q;
			if (value > 0.05) newValue = 0.1;
			if (value > 0.09) newValue = Math.round(value*10)/10;
			if (value > 1.99) newValue = Math.round(value);
			changeFilterProperty(selectedDSPChannel, selectedFilter, "Q", newValue);
			break;
		case "lp":
			break;
		case "hp":
			break;
	}
}


// adapted from: https://stackoverflow.com/questions/846221/logarithmic-slider
function convertHz(value, targetFormat, maxp) {
	minp = 0;
	if (!maxp) maxp = 300;
	
	minv = Math.log(10);
	maxv = Math.log(20000);
	
	// calculate adjustment factor
	scale = (maxv-minv) / (maxp-minp);
	
	if (targetFormat == "linear") {
		return (Math.log(value)-minv) / scale + minp;
	} else {
		result = Math.exp(minv + scale*(value-minp));
		if (result > 99) result = Math.round(result/10)*10;
	  	if (result > 999) result = Math.round(result/100)*100;
	
	  	return Math.round(result);
	}
}


// COPY/PASTE
// Uses Local Storage as persistent clipboard.

// Note: There is a clipboard check in elements-app.js at menuTransition.

var filterCopyTargetCh = null;
var filterCopyTarget1 = null;

function copyFilters(selected) {
	if (filterCopyTargetCh == null) filterCopyTargetCh = selectedDSPChannel;
	if (filterCopyTarget1 == null) filterCopyTarget1 = selectedFilter-4;
	if (selected) {
		//filterClipboardType = 1;
		//singleFilter = {};
		//singleFilter = channels[selectedDSPChannel].filters[selectedFilter-4];
		// Conveniently takes care of stringifying the data for local storage and also cloning the data (without leaving references to the original).
		// Idea: https://stackoverflow.com/questions/28482593/copying-an-array-of-objects-into-another-array-in-javascript-deep-copy
		localStorage.filterClipboard = JSON.stringify({type: 1, content: channels[filterCopyTargetCh].filters[filterCopyTarget1]});
		$("#paste-filters-menu-item .menu-label").text("Paste One Filter");
		//filterClipboardContent = Object.assign({}, channels[selectedDSPChannel].filters[selectedFilter-4]);
	} else {
		//filterClipboardType = 0;
		//allFilters = [];
		localStorage.filterClipboard = JSON.stringify({type: 0, content: channels[filterCopyTargetCh].filters});
		$("#paste-filters-menu-item .menu-label").text("Paste "+(maxFilters-4)+" Filters");
		//filterClipboardContent = JSON.parse(JSON.stringify(channels[selectedDSPChannel].filters));
		//filterClipboardContent = allFilters;
	}
	$("#paste-filters-menu-item").removeClass("disabled");
	ask();
	
	filterPasteTargetCh = null;
	filterPasteTarget1 = null;
	filterCopyTargetCh = null;
	filterCopyTarget1 = null;
}

var filterPasteTargetCh = null;
var filterPasteTarget1 = null;

function pasteFilters() {
	
	if (filterPasteTargetCh == null) filterPasteTargetCh = selectedDSPChannel;
	filterClipboard = JSON.parse(localStorage.filterClipboard);
	//console.log(filterClipboard.content);
	if (filterClipboard.type != null) {
		if (filterClipboard.type == 1) {
			if (filterPasteTarget1 == null) filterPasteTarget1 = selectedFilter-4;
			channels[filterPasteTargetCh].filters[filterPasteTarget1] = Object.assign({}, filterClipboard.content);
			createFilter(filterPasteTargetCh, filterPasteTarget1+4, "peak", channels[filterPasteTargetCh].filters[filterPasteTarget1].Fc, channels[filterPasteTargetCh].filters[filterPasteTarget1].boost, channels[filterPasteTargetCh].filters[filterPasteTarget1].Q, channels[filterPasteTargetCh].filters[filterPasteTarget1].enabled);
			//drawMagnitudeResponse(selectedDSPChannel, selectedFilter);
			drawPhaseResponse(selectedDSPChannel);
			if (filterPasteTargetCh == selectedDSPChannel && selectedFilter-4 == filterPasteTarget1) {
				selectFilter(selectedFilter, true);
			} else {
				drawMagnitudeResponse(selectedDSPChannel, selectedFilter);
				// The pasted channel is not currently selected. Just draw the channel without displaying any of its settings, because another channel is on screen.
			}
			sendFilterToProduct(filterPasteTargetCh, filterPasteTarget1);
		} else {
			channels[filterPasteTargetCh].filters = filterClipboard.content.slice();
			for (var i = 4; i < maxFilters; i++) {
				createFilter(filterPasteTargetCh, i, "peak", channels[filterPasteTargetCh].filters[i-4].Fc, channels[filterPasteTargetCh].filters[i-4].boost, channels[filterPasteTargetCh].filters[i-4].Q, channels[filterPasteTargetCh].filters[i-4].enabled);
				//sendFilterToProduct(selectedDSPChannel, i-4);
				if (filterPasteTargetCh == selectedDSPChannel) {
					$("#filter-selector-item-"+(i-4)+" .filter-value").text(channels[selectedDSPChannel].filters[i-4].Fc);
				}
			}
			sendChannelFiltersToProduct(filterPasteTargetCh, channels[filterPasteTargetCh].filters);
			drawPhaseResponse(selectedDSPChannel);
			if (filterPasteTargetCh == selectedDSPChannel) {
				selectFilter(selectedFilter, true);
			} else {
				drawMagnitudeResponse(selectedDSPChannel, selectedFilter);
				// The pasted channel is not currently selected. Just draw the channel without displaying any of its settings, because another channel is on screen.
			}
		}
	}
	
	
	filterPasteTargetCh = null;
	filterPasteTarget1 = null;
	filterCopyTargetCh = null;
	filterCopyTarget1 = null;
}

function getFilterCopyPasteMenu(target) {
	filterPasteTargetCh = null;
	filterPasteTarget1 = null;
	filterCopyTargetCh = null;
	filterCopyTarget1 = null;
	
	if (localStorage.filterClipboard) {
		filterClipboard = JSON.parse(localStorage.filterClipboard);
	} else {
		filterClipboard = {type: null, content: {}};
	}
	if ($(target).hasClass("dsp-ch")) {
		letter = $(target).attr("id").slice(-1);
		channelIndex = channelString.indexOf(letter);
		if (selectedDSPChannel != null) {
			if (filterClipboard.type == 1) {
				menu = "filter-copy-10-paste-1";
				filterPasteTarget1 = selectedFilter-4;
				filterPasteTargetCh = channelIndex;
			} else if (filterClipboard.type == 0) {
				menu = "filter-copy-10-paste-10";
				filterPasteTargetCh = channelIndex;
			} else {
				menu = "filter-copy-10";
			}
			filterCopyTargetCh = channelIndex;
			
		} else {
			if (filterClipboard.type == 0) {
				menu = "filter-copy-10-paste-10";
				filterPasteTargetCh = channelIndex;
			} else {
				menu = "filter-copy-10";
			}
			filterCopyTargetCh = channelIndex;
		}
	}
	if ($(target).hasClass("dsp-filter")) {
		//letter = $(target).attr("id").slice(-1);
		filterIndex = parseInt($(target).attr("id").slice(-1));
		//console.log(filterIndex);
		if (selectedDSPChannel != null) {
			if (filterClipboard.type == 1) {
				menu = "filter-copy-1-paste-1";
				filterPasteTarget1 = filterIndex;
			} else {
				menu = "filter-copy-1";
			}
			filterCopyTarget1 = filterIndex;
		}
	}
	//console.log(menu);
	return menu;
}