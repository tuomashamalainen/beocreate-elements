// BANG & OLUFSEN
// Elements TV Screen Test

var products = [];
var simulation = true;

var socket;
var productConnection;

var selectedProductIndex = 0;
var lastConnectedProductIndex = 0;
var autoCycleProducts = false;
var connected = false;
var connecting = false;
var reconnected = false;

var productCycleIndex = null;
var initialProductIndex = 0;
var socketAutoCycle = false;
var connectionAttemptCount = 0;
var anotherProductSelected = false;
var connectionAnimationTimeout;
var productConnectionTimeout;
var shouldAnnounceProductName = false;
var shouldPerformActionUponReconnect = false;

var maxConnectionAttempts = 10;
var overrideMaxConnectionAttempts = false;
var reconnectTimeout = null;

var cacheIndex = null;
var showingCachedInfo = false;
var cachedInfo = [];
var dataPopulated = false;


connectProduct();


function connectProduct() {


	//console.log(productCycleIndex);
	// Product index is set, open a connection if the maximum number of attempts has not been exceeded.
	if (overrideMaxConnectionAttempts) connectionAttemptCount = 0;
	if (connectionAttemptCount <= maxConnectionAttempts) {
		
		
		connecting = true;
		$(".status").text("Connecting to localhost...");
		productConnection = new WebSocket('ws://127.0.0.1:1337', ["beo-remote"]);


		// if another product was selected, start animation sooner.
		if (anotherProductSelected == true || (socketAutoCycle == true && connectionAttemptCount == 1)) {
			connectionAnimationDelay = 10;
			overrideMaxConnectionAttempts = false;
			anotherProductSelected = false;
		} else {
			connectionAnimationDelay = 1000;
		}

		connectionAnimationTimeout = setTimeout(function() {
			
			
			$("#connecting-screen h2").text("Looking for product...");
			
			$("body").removeClass("cached-info");
			
			

			localStorage.removeItem("cacheIndex");
			localStorage.removeItem("cachedInfo");
			cacheIndex = null;
			cachedInfo = [];
			dataPopulated = false;
		}, connectionAnimationDelay);

		
		productConnectionTimeout = setTimeout(function() {
			$(".status").text("No response from localhost, trying again.");
			productConnection.close();
		}, 5000);

		// Message received from the product.
		productConnection.onmessage = function(message) {
			processReceivedData(JSON.parse(message.data));
		};

		// Error.
		productConnection.onerror = function(error) {

		};

		// Socket closes, either because the connection is lost or because the connection attempt failed. Socket could also close when another product is selected.
		productConnection.onclose = function() {

			clearTimeout(productConnectionTimeout);
			if (anotherProductSelected == true || connected == false) {
				reconnected = false;
			}

			if (anotherProductSelected == true) {
				connectionAttemptCount = 0;
			}


			if (connected) {
				// there was an active connection, so do a quick first reconnect.
				$(".status").text("Disconnected from localhost.");

				$("body").addClass("disconnected unauthenticated").removeClass("connected authenticated");
				connected = false;
				reconnected = true;
				connectProduct(selectedProductIndex);
			} else {
				// no previous connection, so connection failed

				$(".status").text("Couldn't connect to localhost.");

				
				connectionDelay = 5000;
				// Reconnect
				reconnectTimeout = setTimeout(function() {
					connectProduct();
				}, connectionDelay);
			}
		};

		// Socket opens.
		productConnection.onopen = function() {
			$(".status").text("Connected to localhost.");
			clearTimeout(productConnectionTimeout);
			//endSetup();


			clearTimeout(connectionAnimationTimeout);
			
			if (!showingCachedInfo) {
				shouldAnnounceProductName = true;
				
			}

			//sendToSpeaker('rfal indx'); // Send handshake signal here
			
			sendToProduct({header: "handshake", content: {operation: "doHandshake", cache: cacheIndex}});

			if (shouldPerformActionUponReconnect) {
				switch (shouldPerformActionUponReconnect) {
					/*case "updated":
						notify(false);
						setTimeout(function() {
							notify("Product Updated", "done.svg");
						}, 500);
						break;*/
				}
				shouldPerformActionUponReconnect = false;
			}

			$("body").removeClass("disconnected").addClass("connected");
			connected = true;
			connecting = false;
			connectionAttemptCount = 0;
			overrideMaxConnectionAttempts = false;
			productCycleIndex = null;
		
		};

	} else if (connectionAttemptCount > maxConnectionAttempts) {
		connecting = false;
		connectionAttemptCount = 0;
		productCycleIndex = null;
		productConnection = null;
		console.log("Couldn't connect. Maximum amount of connection attempts reached.");
		clearTimeout(connectionAnimationTimeout);
		if (socketAutoCycle == false) {
			if (products[selectedProductIndex]) {
				//topText(productNameList[selectedProductIndex], "Not Found", false);
			} else {
				//topText(productAddressList[selectedProductIndex], "Not Found", false);
			}
			$("#connecting-screen h2").text("Not reached");
		} else {
			//topText("No Products Found", "Check Connections & Settings", false);
			$("#connecting-screen h2").text("Products not reached");
		}
	} else {
		$(".status").text("Product index not set.");
	}
}

function retryConnection() {
	connectProduct(selectedProductIndex, autoCycleProducts);
}

function simulateConnection(withIndex) {
	localStorage.removeItem("cacheIndex");
	localStorage.removeItem("cachedInfo");
	$("#connecting-screen, #connect-to").removeClass("visible");
	$("#chrome").removeClass("disabled");
	cacheIndex = null;
	cachedInfo = [];
	$("body").removeClass("cached-info");
	$("body").removeClass("disconnected").addClass("connected");

	connected = true;
	//setTimeout(function() {
		if (localStorage.beoLastSelectedTab) {
			selectTab(localStorage.beoLastSelectedTab);
		}
	//}, 100)
	
	
}

function sendToProduct(jsonObject) {
	if (productConnection) {
		productConnection.send(JSON.stringify(jsonObject));
	} else if (simulation) {
		
	}
}

function processReceivedData(data) {
	// Most of the handlers are in separate .js files that specialise in different areas.
	switch (data.header) {
		case "metadata":
			metadataReceiver(data.content);
			break;
		case "playback":
			playbackReceiver(data.content);
			break;
		case "handshake":
			handshake(data.content);
			break;
		case "connectedScreen":
			if (data.content.operation == "refresh") {
				window.location.reload();
			}
			if (data.content.operation == "passThroughCommand") {
				switch (data.content.commandContent) {
					case "animate":
						if (currentNowPlayingMode == 1) {
							nowPlayingMode(2);
						} else {
							nowPlayingMode(1);
						}
						break;
					case "quitScreen":
						
						window.location.href = "file:///homepage.html?kbd=q";
						//window.location.href = "http://192.168.1.165:8888/elements-tva.html";
						break;
				}
			}
			break;
	}
}



// HANDSHAKE

function handshake(content) {
	
	
}


// PLAYBACK INFO

function metadataReceiver(content) {
	if (content.artist) {
		//$("#top-text h2").text(content.artist);
		//topText(true, content.artist);
		$(".artist").text(content.artist);
	}
	if (content.title) {
		//$("#top-text h1").text(content.title);
		//topText(content.title, true);
		$(".track").text(content.title);
	}
	if (content.picture) {
		$(".artwork-bg").css("background-image", "url(data:image/png;base64," + content.picture + ")");
		$(".artwork-img").attr("src", "data:image/png;base64," + content.picture);
	}
	if (content.progress) {
			timeSplit = content.progress.split("/");
			setupTimeBar(1, timeSplit[0], timeSplit[1], timeSplit[2]);
	}
}

function playbackReceiver(content) {
	if (content.volume) {
		if (content.volume == -1) {
		
		} else {
			volumeAngle = convertVolume(content.volume, 0);
			//drawArc(2, 0, 360, 0);
			//drawArc(1, 0, volumeAngle, false);
		}
	}
	if (content.playerState) {
		if (content.playerState == "play") {
		
		}
		if (content.playerState == "play") {
		
		} 
	}
}

var currentNowPlayingMode = 2;

function nowPlayingMode(mode) {
	switch (mode) {
		case 0: // Hide
			$("#now-playing").addClass("hidden");
			break;
		case 1: // Mini
			$("#now-playing").addClass("hidden");
			$("#menu-system").addClass("visible");
			setTimeout(function() {
				$("#now-playing").addClass("mini").removeClass("hidden");
				$("footer").addClass("visible");
			}, 500)
			break;
		case 2: // Full
			$("#now-playing").addClass("hidden");
			$("#menu-system").removeClass("visible");
			setTimeout(function() {
				$("#now-playing").removeClass("mini").removeClass("hidden");
				$("footer").removeClass("visible");
			}, 500)
			break;
		case 3: // Just show
			break;
	}
	currentNowPlayingMode = mode;
}



function setupTimeBar(stage, startTimeString, currentTimeString, endTimeString) {
	// UNCOMMENT TO USE THE TIME BAR. At its current state it has been found to be somewhat unreliable.
		switch (stage) {
			case 0: // hide time bar
				$("#time-bar").removeClass("visible");
				clearInterval(timeBarInterval);
				timeBarIntervalActive = false;
				currentTime = null;
				break;
			case 1: // set up the time bar
				if (currentTimeString > endTimeString) endTimeString += 4294967295;
				currentTime = Math.round((currentTimeString - startTimeString) / 44100);
				endTime = Math.round((endTimeString - startTimeString) / 44100);
				
				//console.log(currentTime, endTime, playerProgressTimestamp);
				if (playerProgressTimestamp) {
					var d = new Date();
					currentMillis = d.getTime();
					offset = Math.round((currentMillis-playerProgressTimestamp-3000)/1000);
					//console.log(currentTime, offset, endTime);
					if (currentTime+offset <= endTime) {
						currentTime += offset;
					} else {
						currentTime = null;
					}
					playerProgressTimestamp = null;
				}
				
				
				
				if (currentTime != null) {
					if (timeBarIntervalActive) {
						clearInterval(timeBarInterval);
						currentTime -= 3;
						timeBarInterval = setInterval(timeBarUpdate, 1000);
						timeBarUpdate();
					} else {
						timeBarUpdate(); // false
					}
					$("#time-bar").addClass("visible");
				}
				break;
			case 2: // start the time bar
				if (currentTime != null) {
					timeBarInterval = setInterval(timeBarUpdate, 1000);
					timeBarIntervalActive = true;
				}
				break;
			case 3: // pause the time bar
				clearInterval(timeBarInterval);
				timeBarIntervalActive = false;
				currentTime--; // turn back time 1s.
				
		}
		
}

function timeBarUpdate(advanceTime) {
	currentSeconds = currentTime % 60; // % gives seconds over full minutes
	currentMinutes = Math.floor(currentTime / 60); // floor gives full minutes


	remainingSeconds = (endTime - currentTime) % 60;
	remainingMinutes = Math.floor((endTime - currentTime) / 60);

	if (currentTime <= endTime) {
		if (currentSeconds < 0) {
			currentSeconds = currentSeconds * -1;
			if (currentSeconds < 10) {
				currentSecondsString = ":0" + currentSeconds;
			} else {
				currentSecondsString = ":" + currentSeconds;
			}
			$("#time-bar-left").text("-0" + currentSecondsString);
			$("#time-bar-fill").css("-webkit-transform", "scaleX(0)");
		} else {
			if (currentSeconds < 10) {
				currentSecondsString = ":0" + currentSeconds;
			} else {
				currentSecondsString = ":" + currentSeconds;
			}
			$("#time-bar-left").text(currentMinutes + currentSecondsString);
			timePercentage = (currentTime / endTime);
			$("#time-bar-fill").css("-webkit-transform", "scaleX(" + timePercentage + ")");
		}

		if (remainingSeconds < 10) {
			remainingSecondsString = ":0" + remainingSeconds;
		} else {
			remainingSecondsString = ":" + remainingSeconds;
		}
		$("#time-bar-right").text("-" + remainingMinutes + remainingSecondsString);


	}

	if (advanceTime != false) currentTime++; // advance time.
}