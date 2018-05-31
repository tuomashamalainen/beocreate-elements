// BANG & OLUFSEN
// Elements

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


function loadProductsFromStorageAndConnect() {
	if (localStorage.beoProducts) {
		products = JSON.parse(localStorage.beoProducts);
		if (localStorage.beoSelectedProductIndex) {
			selectedProductIndex = localStorage.beoSelectedProductIndex;
		} else {
			selectedProductIndex = 0;
		}
		if (!simulation) {
			if (products) connectProduct(selectedProductIndex, true);
		} else {
			simulateConnection(0);
		}
		printProductList();
	} else {
		showSoundSystemSelectionScreen("onboarding");
	}
	
	
}

var productListManuallyShown = false;
function showSoundSystemSelectionScreen(target, automatic) {
	$("#connect-to").addClass("visible");
	if (target == "connecting") {
		if (!productListManuallyShown && automatic) {
			$("#connecting-screen").addClass("visible");
			$("#select-product-screen, #onboarding-screen").removeClass("visible");
		}
	} else if (target == "products") {
		$("#connecting-screen, #onboarding-screen").removeClass("visible");
		$("#select-product-screen").addClass("visible");
		productListManuallyShown = true;
	} else if (target == "onboarding") {
		$("#onboarding-screen").addClass("visible");
		$("#connecting-screen, #select-product-screen").removeClass("visible");
	
	} else if (target == false) {
		productListManuallyShown = false;
		if (!connected) {
			if (!automatic) {
				$("#connecting-screen").addClass("visible");
				$("#select-product-screen, #onboarding-screen").removeClass("visible");
			}
		} else {
			$("#connect-to").removeClass("visible");
		}
	}
}

function printProductList() {
	if (products) {
		$("#product-list").empty();
		$("#connecting-products").empty();
		for (var i = 0; i < products.length; i++) {
			if (products[i].systemName) {
				menuTitle = products[i].systemName;
			} else {
				menuTitle = products[i].hostname;
			}
			$("#product-list").append('<div class="menu-item icon left checkbox swipe-delete product-item product-item-'+i+'" onclick="selectProduct('+i+');"><img class="menu-icon checkmark left" src="symbols-black/checkmark.svg"><div class="menu-label">'+menuTitle+'</div><img class="menu-icon right delete" src="symbols-black/delete.svg"><div class="swipe-delete-button">Delete</div></div>');
			$("#connecting-products").append('<div class="product-item product-item-'+i+'">'+menuTitle+'</div>');
		}
		highlightSelectedProduct(selectedProductIndex);
	}
}

var productEditMode = false;
function toggleProductEditMode(force) {
	if (force == true) productEditMode = false;
	if (force == false) productEditMode = true;
	if (productEditMode == false) {
		$("#product-edit-toggle").attr("src", "symbols-black/done.svg");
		$("#close-select-product-screen").addClass("disabled");
		$("#product-list .product-item").addClass("delete");
		productEditMode = true;
	} else {
		$("#product-edit-toggle").attr("src", "symbols-black/delete.svg");
		$("#close-select-product-screen").removeClass("disabled");
		$("#product-list .product-item").removeClass("delete");
		showDeleteButton();
		productEditMode = false;
	}
}

function highlightSelectedProduct(productIndex, target) {
	if (!target || target == "list") {
		$("#product-list .product-item").removeClass("checked");
		if (productIndex != null) $("#product-list .product-item-"+productIndex).addClass("checked");
	}
	if (!target || target == "connecting") {
		$("#connecting-products .product-item").removeClass("current");
		if (productIndex != null) $("#connecting-products .product-item-"+productIndex).addClass("current");
	}
}

function addOrUpdateProduct(atIndex, info, connectNow) {
	
	if (atIndex == null) {
		// Adds a new product if it doesn't exist.
		existingProduct = null;
		if (info.hostname) {
			for (var i = 0; i < products.length; i++) {
				if (products[i].hostname == hostname) {
					existingProduct = i;
				}
			}
		}
		if (existingProduct == null) {
			atIndex = products.push({});
			atIndex--;
		} else {
			// Notify that the product exists.
		}
	}
	//console.log(atIndex, products[atIndex]);
	if (atIndex != null && products[atIndex] != undefined) {
		// Product exists, add info
		if (info.hostname) products[atIndex].hostname = info.hostname;
		if (info.systemName) products[atIndex].systemName = info.systemName;
		if (info.modelName) products[atIndex].modelName = info.modelName;
		
		localStorage.beoProducts = JSON.stringify(products);
		printProductList();
		if (connectNow) selectProduct(atIndex, true);
	}
	return atIndex;
}

function inputProduct() {
	options = {placeholders: {text: "System Name"}};
	startTextInput(1, "Add System", "Enter the name of the system. Alternatively, enter its hostname (without \".local\").", options, function(details) {
		hostname = generateHostname(details.text)+".local";
		info = {systemName: details.text, hostname: hostname};
		productAddResult = addOrUpdateProduct(null, info, true);
		if (productAddResult != null) {
			notify(details.text + " added", "", "done");
		} else {
			notify(details.text + " already added", "", "notification");	
		}
	});
}

function generateHostname(readableName) {
	n = readableName.toLowerCase(); // Convert to lower case
	n = removeDiacritics(n); // Remove diacritics
	n = n.replace(" ", "-"); // Replace spaces with hyphens
	n = n.replace(/[^\w\-]|_/g, ""); // Remove non-alphanumeric characters except hyphens
	n = n.replace(/-+$/g, ""); // Remove hyphens from the end of the name.
	return n; //+".local"; // Add .local
}

function selectProduct(withIndex, force) {
	if (!productEditMode) {
		if (selectedProductIndex != withIndex || force) {
			productListManuallyShown = false;
			highlightSelectedProduct(withIndex);
			selectedProductIndex = withIndex;
			localStorage.beoSelectedProductIndex = selectedProductIndex;
			anotherProductSelected = true;
			if (connected) {
				productConnection.close();
			} else {
				if (productConnection) {
					productConnection.close();
				} else {
					connectProduct(selectedProductIndex);
				}
			}
		}
	} else {
		showDeleteButton(".product-item-"+withIndex);
	}
}

function connectProduct(withIndex, autoCycle) {


	// Set the index of the product we're trying to connect to.
	if (productCycleIndex == null) {
		// productCycleIndex has not been set.
		console.log("Trying to open a connection to a product...");
		productCycleIndex = withIndex;
		initialProductIndex = withIndex;
		if (autoCycle == true) {
			if (products.length > 1) {
				// no point in automatic cycling, if only one product is saved.
				console.log("Will cycle through list of products.");
				socketAutoCycle = true;
			}
		} else {
			socketAutoCycle = false;
		}
	} else {
		// productCycleIndex has been set, advance if automatic cycling is enabled.
		if (socketAutoCycle == true) {
			if (productCycleIndex < products.length - 1) {
				productCycleIndex++;
			} else {
				productCycleIndex = 0;
			}
		}
		if (productCycleIndex == initialProductIndex) {
			// keep track how many times we've gone through the list of products.
			connectionAttemptCount++;
		}
	}

	//console.log(productCycleIndex);
	// Product index is set, open a connection if the maximum number of attempts has not been exceeded.
	if (overrideMaxConnectionAttempts) connectionAttemptCount = 0;
	if (productCycleIndex != null && connectionAttemptCount <= maxConnectionAttempts) {
		
		highlightSelectedProduct(productCycleIndex, 'connecting');
		
		connecting = true;
		console.log("Looking for " + products[productCycleIndex].hostname + "...");
		productConnection = new WebSocket('ws://' + products[productCycleIndex].hostname + ':1337', ["beo-remote"]);


		// if another product was selected, start animation sooner.
		if (anotherProductSelected == true || (socketAutoCycle == true && connectionAttemptCount == 1)) {
			connectionAnimationDelay = 10;
			overrideMaxConnectionAttempts = false;
			anotherProductSelected = false;
		} else {
			connectionAnimationDelay = 1000;
		}

		connectionAnimationTimeout = setTimeout(function() {
			
			if (socketAutoCycle == false) {
				if (products[productCycleIndex].productName) {
					//topText(products[productCycleIndex].productName, "Connecting...");
					
				} else {
					//topText(products[productCycleIndex].hostname, "Connecting...");
				}
				$("#connecting-screen h2").text("Looking for product...");
			} else {
				if (products[productCycleIndex].productName) {
					//topText("Looking for Products...", products[productCycleIndex].productName);
				} else {
					//topText("Looking for Products...", products[productCycleIndex].hostname);
				}
				$("#connecting-screen h2").text("Looking for products...");
			}
			$("body").removeClass("cached-info");
			
			showSoundSystemSelectionScreen("connecting", true);
			

			localStorage.removeItem("cacheIndex");
			localStorage.removeItem("cachedInfo");
			cacheIndex = null;
			cachedInfo = [];
			dataPopulated = false;
		}, connectionAnimationDelay);

		if (socketAutoCycle == true) {
			productConnectionTimeout = setTimeout(function() {
				console.log("No response from " + products[selectedProductIndex].hostname + ", trying next product.");
				productConnection.close();
			}, 1500);
		} else {
			productConnectionTimeout = setTimeout(function() {
				console.log("No response from " + products[selectedProductIndex].hostname + ", trying again.");
				productConnection.close();
			}, 5000);
		}

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
				console.log("Disconnected from " + products[selectedProductIndex].hostname + ".");

				$("body").addClass("disconnected unauthenticated").removeClass("connected authenticated");
				connected = false;
				reconnected = true;
				connectProduct(selectedProductIndex);
			} else {
				// no previous connection, so connection failed

				console.log("Couldn't connect to " + products[productCycleIndex].hostname + ".");
				if (anotherProductSelected) console.log("Selecting another product: " + products[selectedProductIndex].hostname + ".");

				if (socketAutoCycle == true || anotherProductSelected == true) {
					// if cycling is on, try next product sooner, or another product is selected.
					connectionDelay = 100;
				} else {
					connectionDelay = 5000;
				}
				// Reconnect
				reconnectTimeout = setTimeout(function() {
					if (anotherProductSelected) {
						productCycleIndex = null;
						connectProduct(selectedProductIndex);
					} else {
						connectProduct();
					}
				}, connectionDelay);
			}
		};

		// Socket opens.
		productConnection.onopen = function() {
			console.log("Connected to " + products[productCycleIndex].hostname + ".");
			clearTimeout(productConnectionTimeout);
			//endSetup();

			if (socketAutoCycle == true && productCycleIndex != initialProductIndex) {
				socketAutoCycle = false;
				selectedProductIndex = productCycleIndex;
				localStorage.beoSelectedProductIndex = selectedProductIndex;
				highlightSelectedProduct(selectedProductIndex);
				
			}

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
			showSoundSystemSelectionScreen(false, true);

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
			highlightSelectedProduct(null, "connecting");
		}
	} else {
		console.log("Product index not set.");
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
		case "dsp":
			dspDataReceiver(data.content);
			break;
		case "wifi":
			wifiDataReceiver(data.content);
			break;
		case "metadata":
			metadataReceiver(data.content);
			break;
		case "playback":
			playbackReceiver(data.content);
			break;
		case "handshake":
			handshake(data.content);
			break;
	}
}



// HANDSHAKE

function handshake(content) {
	info = {};
	if (content.systemName) info.systemName = content.systemName;
	addOrUpdateProduct(selectedProductIndex, info);
}