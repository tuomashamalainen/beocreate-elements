// BANG & OLUFSEN
// Elements

var availableNetworks;
var savedNetworks;
var wifiMode = "";
var wifiScanTriedAgain = false;

function wifiDataReceiver(content) {

	if (content.type == "available") {
		$(".wifi-available-list").empty();
		availableNetworks = content.networks;
		if (availableNetworks == null) {
			if (!wifiScanTriedAgain) {
				sendToProduct({header: "wifi", content: {operation: "listAvailable"}});
				wifiScanTriedAgain = true;
			}
			return;
		}
		for (var i = 0; i < content.networks.length; i++) {
			network = content.networks[i];
			
			// Determine signal strength icon
			if (network.quality > 60) {
				signalIcon = 3;
			} else if (network.quality > 40) {
				signalIcon = 2;
			} else if (network.quality > 30) {
				signalIcon = 1;
			} else {
				signalIcon = 0;
			}
			
			extraClasses = "";
			if (network.added) extraClasses += " disabled added";
			if (network.security != "open") extraClasses += " secure";
			
			hexEscapedNetworkName = network.ssid.decodeEscapeSequence();
			networkName = decodeUTF8(hexEscapedNetworkName);
			
			$(".wifi-available-list").append('<div class="wifi-available-item wifi-available-item-' + i + ' menu-item icon left'+extraClasses+'" onclick="addNetwork('+i+');"><div class="one-row"><img class="menu-icon left" src="symbols-black/wifi-'+signalIcon+'.svg"><div class="menu-label">' + networkName + '</div><img class="menu-icon right lock" src="symbols-black/lock.svg"></div><div class="menu-value">Added</div></div>');
		}
	}
	if (content.type == "saved") {
		$(".wifi-saved-list").empty();
		$(".wifi-connected-wrap, .wifi-saved-wrap").addClass("hidden");
		if (content.networks) {
			/*if (currentSetupStep != null) {
				if (allowAdvancingToStep < 2) allowAdvancingToStep = 2;
				checkIfAllowsNextStep();
			}*/
		}
		savedNetworks = content.networks;
		for (var i = 0; i < content.networks.length; i++) {
			network = content.networks[i];
			
			//console.log(network.SSID);
			hexEscapedNetworkName = network.SSID.decodeEscapeSequence();
			//console.log(hexEscapedNetworkName);
			networkName = decodeUTF8(hexEscapedNetworkName);
			//console.log(networkName);
			extraClasses = "";
			if (network.current) {//extraClasses += " current";
				
				$(".wifi-connected-item .menu-label").text(networkName);
				$(".wifi-connected-item").attr("onclick", "removeNetwork("+i+");");
				$(".wifi-connected-wrap").removeClass("hidden");
			} else {
				if (network.errors == "tempDisabled") extraClasses = " wrong-password";
				$(".wifi-saved-list").append('<div class="menu-item wifi-saved-item wifi-saved-item-' + network.ID + ' icon left'+extraClasses+'" onclick="removeNetwork('+i+');"><div class="one-row"><img class="menu-icon left" src="symbols-black/wifi.svg"><div class="menu-label">' + networkName + '</div><img class="menu-icon right" src="symbols-black/delete.svg"></div><div class="menu-value red">Invalid Password</div></div>');
				$(".wifi-saved-wrap").removeClass("hidden");
			}
		}
	}
	if (content.type == "added") {
		if (content.SSID) {
			hexEscapedNetworkName = content.SSID.decodeEscapeSequence();
			networkName = decodeUTF8(hexEscapedNetworkName);
			notify(networkName + " added", "", "wifi-add");
			setTimeout(function() {
				wifiScanTriedAgain = true;
				sendToProduct({header: "wifi", content: {operation: "listAvailable"}});
				sendToProduct({header: "wifi", content: {operation: "listSaved"}});
			}, 500);
		}
	}
	if (content.type == "removed") {
		setTimeout(function() {
			wifiScanTriedAgain = true;
			sendToProduct({header: "wifi", content: {operation: "listAvailable"}});
			sendToProduct({header: "wifi", content: {operation: "listSaved"}});
		}, 500);
	}
	if (content.type == "status") {
		if (content.status.quality) {
			// Determine signal strength icon
			if (content.status.quality > 60) {
				signalIcon = 3;
			} else if (content.status.quality > 40) {
				signalIcon = 2;
			} else if (content.status.quality > 30) {
				signalIcon = 1;
			} else {
				signalIcon = 0;
			}
			$(".wifi-connected-item .menu-icon.left").attr("src", "symbols-black/wifi-"+signalIcon+".svg");
		}
	}
	if (content.type == "ip") {
		$(".system-ip").text(content.ip);
	}
}


function addOtherNetwork() {
	options = {placeholders: {text: "Network Name", password: "Password"}, minLength: {password: 8}, optional: {password: true}};
	startTextInput(3, "Add Other", "Enter the name and password of the network you would like to add. If the network has no password, leave it blank.", options, function(details) {
		sendToProduct({header: "wifi", content: {operation: "add", options: {SSID: details.text, password: details.password}}});
	});
}

function addNetwork(index, confirm) {
	if (availableNetworks[index].security != "open") {
		// Ask for password.
		options = {placeholders: {password: "Password"}, minLength: {password: 8}};
		startTextInput(2, "Enter Password", availableNetworks[index].ssid+" is a secure network. Enter password.", options, function(details) {
			sendToProduct({header: "wifi", content: {operation: "add", options: {ID: index, password: details.password}}});
	});
	} else {
		// Confirm adding an open network.
		if (!confirm) {
			ask("open-network-ask-menu", [availableNetworks[index].ssid], [function() {addNetwork(index, 1)}]);
		} else {
			sendToProduct({header: "wifi", content: {operation: "add", options: {ID: index}}});
		}
	}
}

function removeNetwork(index, confirm) {
	if (!confirm) {
		hexEscapedNetworkName = savedNetworks[index].SSID.decodeEscapeSequence();
			networkName = decodeUTF8(hexEscapedNetworkName);
		if (!savedNetworks[index].current) {
			ask("remove-network-ask-menu", [networkName], [function() {removeNetwork(index, 1)}]);
		} else {
			ask("remove-current-network-ask-menu", [networkName], [function() {removeNetwork(index, 1)}]);
		}
	} else {	
		sendToProduct({header: "wifi", content: {operation: "remove", ID: savedNetworks[index].ID}});
	}
}