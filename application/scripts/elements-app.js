// BANG & OLUFSEN
// BeoCreate Elements

var windowWidth = 0;
var windowHeight = 0;
var beoCacheTags = {};


window.addEventListener('load', function() {
	
	// FastClick
	new FastClick(document.body);
	
	
	populateTabBar();
	$("#tab-bar").removeClass("disabled");
	setupCanvases();
	drawArc(2, 0, 360, 0);
	//drawArc(1, 0, 120, 0);
	getWindowDimensions();
	
	if (localStorage.beoCacheTags) {
		// Load cache tags. With tags, the app can ask the server if it needs to update information, such as sound settings or player metadata. The truth is always on the server.
		beoCacheTags = JSON.parse(localStorage.beoCacheTags);
	}
	//loadProductsFromStorageAndConnect();
	connectToCurrentDomain();
	
	//notifyDot("wifi", "yellow");
}, false);

var resizeTimeout;

function getWindowDimensions() {
	windowHeight = window.innerHeight;
	windowWidth = window.innerWidth;
}

window.onresize = function() {
	clearTimeout(resizeTimeout);
	resizeTimeout = setTimeout(function() {
		getWindowDimensions();
		//setQuickLookAlbumNameMargin();
		//evaluateTextScrolling();
	}, 200);

};


//if (products) connectProduct(0, true);

//if ($this[0].scrollHeight > $this.innerHeight()) {
//	if ($this.scrollTop() == 0) {
//		$this.scrollTop(1);
//	} else if ($this.scrollTop() == $this[0].scrollHeight - $this.innerHeight()) {
//		$this.scrollTop($this[0].scrollHeight - $this.innerHeight() - 1);
//	}
//}


// APPLICATION ESSENTIALS


// TAB SELECTION
// All sections in the app are technically 'tabs', no matter if they're accessed through the 'More' menu or selecting one of the four configured icons in the tab bar. Selecting a tab by index number selects one of the tab bar items. Selecting a tab by name works the same, but allows any tab to be selected.

var selectedTab = null;
var selectedTabIndex = 0;
var configuredTabs;
var tabIcons;
var tabBarColourMode = "light";
//var previousTab = "";


function populateTabBar() {
	// Load custom tabs if set, or load default tabs.
	if (localStorage.beoConfiguredTabs) {
		configuredTabs = JSON.parse(localStorage.beoConfiguredTabs);
		tabIcons = JSON.parse(localStorage.beoTabIcons);
	} else {
		configuredTabs = ["now-playing", "sound", "wifi", "sources"];
		tabIcons = ["controller.svg","volume.svg","wifi-3.svg","input.svg"];
	}
	
	reloadTabBarIcons();
}

function reloadTabBarIcons(withTheme) {
	if (withTheme) tabBarColourMode = withTheme;
	if (tabBarColourMode == "light") {
		symbolFolder = "symbols-black/";
		$("#tab-bar").removeClass("dark");
	} else if (tabBarColourMode == "dark") {
		symbolFolder = "symbols/";
		$("#tab-bar").addClass("dark");
	}
	$("#tab-bar-more img").attr("src", symbolFolder+"more.svg");
	for (var i = 0; i < 4; i++) {
		$("#tab-bar-item-"+i+" img").attr("src", symbolFolder+tabIcons[i]);
	}
}


function selectTab(tab) {
	//if (!configuredTabs) populateTabBar();
	
	if (isNaN(tab)) { // Selecting tab with name.
		newTab = tab;
		newSelectedTabIndex = null;
	} else { // Selecting tab with index number.
		newTab = configuredTabs[tab];
		newSelectedTabIndex = tab;
	}
	
	if (!dragTarget) {
		momentary = true;
		// Some "tabs" act like momentary buttons, performing a custom action instead of switching to a tab.
		// This is different from performing a custom action _while_ switching to a tab. That functionality is further below.
		switch (newTab) {
			case "select-product":
				showSoundSystemSelectionScreen('products');
				break;
			default:
				momentary = false;
				break;
		}
	
		if (!momentary) {
			selectedTabIndex = newSelectedTabIndex;
			localStorage.beoLastSelectedTab = newTab;
			if (newTab.indexOf("/") != -1) {
				// The tab icon is a "deep shortcut" to a submenu within a tab.
				submenu = newTab.split("/")[1];
				newTab = newTab.split("/")[0];
			} else {
				submenu = null;
			}
			if (selectedTab != newTab) { // New tab was selected.
				if (selectedTab != null) {
					$("#tab-bar ul li").removeClass("selected");
					previousTab = selectedTab;
					
					$("#tab-"+selectedTab).removeClass("visible");
					setTimeout(function() {
						$("#tab-"+previousTab).removeClass("block");
					}, 520);
				}
				$("#tab-"+newTab).addClass("block");
				//setTimeout(function() {
					$("#tab-"+newTab).addClass("visible");
				//}, 50);
				
				if (newTab == "now-playing") {
					reloadTabBarIcons("dark");
				} else {
					reloadTabBarIcons("light");
				}
				
				tabBarIndex = configuredTabs.indexOf(newTab);
				if (tabBarIndex != -1) { // The selected tab is in the tab bar, highlight it.
					$("#tab-bar-item-"+tabBarIndex).addClass("selected");
				} else if (newTab == "more") { // 'More' is a special case, because it is always in the tab bar.
					$("#tab-bar-more").addClass("selected");
				}
				
				selectedTab = newTab;
				//console.log("New tab: "+selectedTab);
				
				checkTabBarSubmenuSelection();
				
				// Perform actions when switching tabs.
				evaluateTextScrolling(2); // Stops text from scrolling in now-playing when switching to another tab.
				
				switch (selectedTab) {
					case "sound":
						sendToProduct({header: "dsp", content: {operation: "getChannelSettings"}});
						break;
					case "wifi":
						wifiScanTriedAgain = true;
						sendToProduct({header: "wifi", content: {operation: "listAvailable"}});
						sendToProduct({header: "wifi", content: {operation: "status"}});
						sendToProduct({header: "wifi", content: {operation: "listSaved"}});
						break;
					case "now-playing":
						evaluateTextScrolling(1);
						break;
				}
			} else {
				if (!submenu) {
					// Go up in menu structure if another tab was not selected and we're not moving into a submenu.
					toScreen = $("#tab-"+selectedTab+" .menu-screen.block").attr("data-edge-swipe-previous");
					if (toScreen) {
						fromScreen = $("#tab-"+selectedTab+" .menu-screen.block").attr("id");
						menuTransition(fromScreen,toScreen,0);
					}
				}
			}
			if (submenu) {
				mainMenu = $("#tab-"+newTab).attr("data-main-menu");
				currentSubmenu = $("#tab-"+newTab+" .menu-screen.block").attr("id");
				//console.log(currentSubmenu);
				if (!currentSubmenu || currentSubmenu == submenu) {
					//
				} else {
					// Another submenu is open; back out to avoid issues and then open the new menu.
					$("#tab-"+newTab+" #"+currentSubmenu).addClass("hidden-right");
					setTimeout(function() {
						$("#tab-"+newTab+" #"+currentSubmenu).removeClass("block");
					}, 600);
					$("#tab-"+newTab+" #"+mainMenu).removeClass("hidden-left hidden-right").addClass("block");
					$("#tab-"+newTab+" .menu-screen.hidden-left").removeClass("hidden-left").addClass("hidden-right");
				}
				menuTransition(mainMenu,submenu,1);
			}
		}
	}
}

// TAB BAR DRAG
var dragAndDropDelay = null;
var dragTarget = null;
var dragStart = [0,0];
var dragMove = 0;

var tabsReconfigured = false;
var tabWidth = 0;
var tabOffset = 0;
var dragTabIndex = 0;
var lastTabMoveTo = 0;
var moveTo = 0;

// REORDER TAB BAR ITEMS
$( ".tab-bar-item.draggable" ).draggable({
	//cursorAt: { top: 0, left: 0 },
	//delay: 500,
	scroll: false,
	helper: function( event ) {
	return $( "<div class='ui-widget-header' style='display: none;'>I'm a custom helper</div>" );
	},
	start: function( event, ui ) {
		
		//console.log(tabWidth);
		dragTarget = $(event.target).attr("id");
		dragStart = [ui.position.left, ui.position.top];
		tabWidth = document.getElementById(dragTarget).offsetWidth;
		$("#"+dragTarget).addClass("drag");
		dragTabIndex = parseInt(dragTarget.slice(-1));
		//console.log(dragTabIndex);
	},
	stop: function( event, ui ) {
		$("#"+dragTarget).removeClass("drag");
		if (tabsReconfigured) {
			$("#tab-bar").addClass("reorder-moment");
			$("#"+dragTarget).css("transform", "");
			tabsReconfigured = false;
			//console.log(dragTabIndex+" moved to "+moveTo+", "+selectedTabIndex+" selected.");
			$("#tab-bar ul li").removeClass("shift-left shift-right");
			
		
			movedTab = configuredTabs[dragTabIndex];
			configuredTabs.splice(dragTabIndex, 1);
			configuredTabs.splice(moveTo, 0, movedTab);
			movedTabIcon = tabIcons[dragTabIndex];
			tabIcons.splice(dragTabIndex, 1);
			tabIcons.splice(moveTo, 0, movedTabIcon);
			
			reloadTabBarIcons();
			notifyDot();
			
			localStorage.beoConfiguredTabs = JSON.stringify(configuredTabs);
			localStorage.beoTabIcons = JSON.stringify(tabIcons);
			
			tabBarIndex = configuredTabs.indexOf(selectedTab);
			if (tabBarIndex != -1) { // The selected tab is in the tab bar, highlight it.
				$("#tab-bar ul li").removeClass("selected");
				$("#tab-bar-item-"+tabBarIndex).addClass("selected");
			}
			
			setTimeout(function() {
				$("#tab-bar").removeClass("reorder-moment");
			}, 100);
		} else {
			$("#"+dragTarget).css("transform", "");
		}
		setTimeout(function() {
			dragTarget = null;
		}, 100);
		
	},
	drag: function( event, ui ) {
	
		dragMove = ui.position.left-dragStart[0];
		if (dragMove < 0) {
			stepsMoved = -1*(Math.floor((dragMove-25)/(-1*tabWidth)));
		} else {
			stepsMoved = Math.floor((dragMove+25)/(tabWidth));
		}
		
		moveTo = parseInt(dragTabIndex+stepsMoved);
		if (moveTo < 4 && moveTo >= 0) {
			if (stepsMoved < 0) {
				//console.log("Moving left to position "+moveTo);
				if (moveTo < lastTabMoveTo) {
					$("#tab-bar-item-"+moveTo).addClass("shift-right");
				} else if (moveTo > lastTabMoveTo) {
					$("#tab-bar-item-"+lastTabMoveTo).removeClass("shift-right");
				}
				tabsReconfigured = true;
			} else if (stepsMoved > 0) {
				//console.log("Moving right to position "+moveTo);
				if (moveTo > lastTabMoveTo) {
					$("#tab-bar-item-"+moveTo).addClass("shift-left");
				} else if (moveTo < lastTabMoveTo) {
					$("#tab-bar-item-"+lastTabMoveTo).removeClass("shift-left");
				}
				tabsReconfigured = true;
			} else {
				//console.log("No reordering");
				$("#tab-bar ul li").removeClass("shift-left shift-right");
				tabsReconfigured = false;
			}
			lastTabMoveTo = moveTo;
		} 
		$("#"+dragTarget).css("transform", "translateX("+dragMove+"px)");
	}
});


// DRAG ITEMS INTO TAB BAR
$( ".tab-bar-capable .menu-icon" ).draggable({
	cursorAt: { bottom: 32, left: 21 },
	//delay: 500,
	scroll: false,
	helper: function( event ) {
	return $( "<div class='ui-widget-header' style='display: none;'>I'm a custom helper</div>" );
	},
	start: function( event, ui ) {
		$("#floating-icon").addClass("float");
		dragStart = [ui.offset.left, ui.offset.top];
		tabWidth = document.getElementById("tab-bar-item-0").offsetWidth;
		tabOffset = $("#tab-bar-item-0").position().left;
		$("#tab-bar").addClass("editing");
	},
	stop: function( event, ui ) {
		$("#floating-icon").removeClass("float");
		$(".tab-bar-item").removeClass("replace");
		$("#tab-bar").removeClass("editing");
		if (tabsReconfigured) {
			newAddress = $(this).parent().attr("data-address");
			symbolFile = $(this).attr("src").split("/")[$(this).attr("src").split("/").length-1];
			//console.log(newAddress);
			
			tabExists = configuredTabs.indexOf(newAddress);
			if (tabExists != -1) {
				oldTab = [configuredTabs[moveTo], tabIcons[moveTo]];
				// The dragged tab already exists. Grab the old icon from the position where the new one will be.
			}
			if (moveTo != tabExists) {
				// The tab that was dragged in does not exist or is in another position. Replace the old icon.
				configuredTabs[moveTo] = newAddress;
				tabIcons[moveTo] = symbolFile;
				
				if (tabExists != -1) {
					// If the new icon used to be in another position, put the old icon to where the new icon used to be.
					configuredTabs[tabExists] = oldTab[0];
					tabIcons[tabExists] = oldTab[1];
				}
				
				reloadTabBarIcons();
				notifyDot();
				
				localStorage.beoConfiguredTabs = JSON.stringify(configuredTabs);
				localStorage.beoTabIcons = JSON.stringify(tabIcons);
			}
			tabsReconfigured = false;
			checkTabBarSubmenuSelection();
		} else {
			$("#floating-icon").css("left", dragStart[0]).css("top", dragStart[1]);
		}
	},
	drag: function( event, ui ) {
		$("#floating-icon").attr("src", $(this).attr("src"));
		$("#floating-icon").css("left", ui.offset.left).css("top", ui.offset.top);
		$(".tab-bar-item").removeClass("replace");
		if (ui.offset.top > windowHeight-75) {
			moveTo = Math.floor((ui.offset.left - tabOffset)/tabWidth);
			if (moveTo < 4) {
				tabsReconfigured = true;
				$("#tab-bar-item-"+moveTo).addClass("replace");
			} else {
				tabsReconfigured = false;
			}
		} else {
			tabsReconfigured = false;
		}
	}
});

var notificationDotFeatures = [];
var notificationDotColours = [];
function notifyDot(feature, colour) {
	if (feature) {
		// Adding, changing or removing the dot for a specific feature
		featureNotificationIndex = notificationDotFeatures.indexOf(feature);
		if (featureNotificationIndex == -1 && colour) {
			notificationDotFeatures.push(feature);
			notificationDotColours.push(colour);
		} else {
			if (colour) {
				notificationDotColours[featureNotificationIndex] = colour;
			} else {
				// Remove the feature from list
				notificationDotFeatures.splice(featureNotificationIndex, 1);
				notificationDotColours.splice(featureNotificationIndex, 1);
			}
		}
	}
	// Update the dots based on the lists. This can be also done by calling the function without arguments (when rearranging the tab bar, for example)
	$(".tab-bar-item .notification-dot").removeClass("visible yellow red");
	for (var i = 0; i < notificationDotFeatures.length; i++) {
		featureTabBarIndex = configuredTabs.indexOf(notificationDotFeatures[i]);
		if (featureTabBarIndex != -1) {
			$("#tab-bar-item-"+featureTabBarIndex+" .notification-dot").addClass("visible "+notificationDotColours[i]);
		}
	}
}



document.ontouchstart = function(event) {
	/*if (event.target.id.indexOf("tab-bar-item-") > -1) {
		if (event.targetTouches) {
			var touch = event.targetTouches[0];
			dragTarget = event.target.id;
			dragStart = [touch.pageX, touch.pageY];
			dragAndDropDelay = setTimeout(function() {
				dragAndDropDelay = null;
				tabWidth = document.getElementById(dragTarget).offsetWidth;
				//console.log(tabWidth);
				$("#"+dragTarget).addClass("drag");
				dragTabIndex = parseInt(dragTarget.slice(-1));
				console.log(dragTabIndex);
			}, 500);
			//event.preventDefault();
		}
	}*/
	
	/*if (event.target.id.indexOf("more-menu-item-") > -1) {
		if (event.targetTouches) {
			var touch = event.targetTouches[0];
			dragTarget = event.target.id;
			dragStart = [touch.pageX, touch.pageY];
			dragAndDropDelay = setTimeout(function() {
				dragAndDropDelay = null;
				tabWidth = document.getElementById(dragTarget).offsetWidth;
				//console.log(tabWidth);
				$("#"+dragTarget).addClass("drag");
				console.log(dragTabIndex);
			}, 500);
			//event.preventDefault();
		}
	}*/

	// Edge swipes.
	if (event.target.id.indexOf("-edge-swipe") > -1) {
		if (event.targetTouches) {
			var touch = event.targetTouches[0];
			edgeSwipe(0, touch.pageX, event.target.id);
			event.preventDefault();
		}
	}
	
	// Show album art.
	if (event.target.id == "top-text") {
		if (event.targetTouches && !$("#artwork-wrapper").hasClass("visible")) {
			var touch = event.targetTouches[0];
			dragStart = [touch.pageX, touch.pageY];
			$("#artwork-wrapper").addClass("drag");
		}
	}
	
	// Hide album art.
	if (event.target.id == "now-playing-artwork") {
		if (event.targetTouches && $("#artwork-wrapper").hasClass("visible")) {
			var touch = event.targetTouches[0];
			dragStart = [touch.pageX, touch.pageY];
			$("#artwork-wrapper").addClass("drag");
			$("#artwork-wrapper").css("opacity", 0.99);
		}
	}
	
	// Change filter Q. The code is in elements-dsp.js.
	if (event.target.id == "dsp-graph-container") {
		if (event.targetTouches.length == 2) {
			filterBandwidthGesture(1, event.targetTouches);
		}
	}
	
	// Change ToneTouch spaciousness. The code is in elements-dsp.js.
	if (event.target.id == "tone-touch-scale-area") {
		event.preventDefault();
		if (event.targetTouches.length == 2) {
			toneTouchGesture(1, event.targetTouches);
		}
	}
	
	if (event.target.className.indexOf("hold-menu") != -1) {
		startHold(event.target, event);
	}
	
	//console.log(event.target.className);
	//console.log(event.target.id);
}



document.ontouchmove = function(event) {
	/*if (dragTarget) {
		if (event.target.id == dragTarget) {
			if (dragAndDropDelay) {
				clearTimeout(dragAndDropDelay);
				dragAndDropDelay = null;
				dragTarget = null;
			} else {
				if (event.targetTouches) {
					var touch = event.targetTouches[0];
					//console.log(touch.pageX-dragStart[0]);
					dragMove = touch.pageX-dragStart[0];
					if (dragMove < 0) {
						stepsMoved = -1*(Math.floor((dragMove-25)/(-1*tabWidth)));
					} else {
						stepsMoved = Math.floor((dragMove+25)/(tabWidth));
					}
					
					moveTo = parseInt(dragTabIndex+stepsMoved);
					if (moveTo < 4 && moveTo >= 0) {
						if (stepsMoved < 0) {
							//console.log("Moving left to position "+moveTo);
							if (moveTo < lastTabMoveTo) {
								$("#tab-bar-item-"+moveTo).addClass("shift-right");
							} else if (moveTo > lastTabMoveTo) {
								$("#tab-bar-item-"+lastTabMoveTo).removeClass("shift-right");
							}
							tabsReconfigured = true;
						} else if (stepsMoved > 0) {
							//console.log("Moving right to position "+moveTo);
							if (moveTo > lastTabMoveTo) {
								$("#tab-bar-item-"+moveTo).addClass("shift-left");
							} else if (moveTo < lastTabMoveTo) {
								$("#tab-bar-item-"+lastTabMoveTo).removeClass("shift-left");
							}
							tabsReconfigured = true;
						} else {
							//console.log("No reordering");
							$("#tab-bar ul li").removeClass("shift-left shift-right");
							tabsReconfigured = false;
						}
						lastTabMoveTo = moveTo;
					} 
					$("#"+dragTarget).css("transform", "translateX("+dragMove+"px)");
					event.preventDefault();
				}
			}
		}	
	}*/

	// Edge swipes.
	if (event.target.id.indexOf("-edge-swipe") > -1) {
		if (event.targetTouches) {
			var touch = event.targetTouches[0];
			edgeSwipe(1, touch.pageX, event.target.id);
			event.preventDefault();
		}
	}
	
	// Show album art.
	if (event.target.id == "top-text") {
		event.preventDefault();
		if (event.targetTouches && !$("#artwork-wrapper").hasClass("visible")) {
			var touch = event.targetTouches[0];
			dragMove = touch.pageY-dragStart[1];
			//event.preventDefault();
			//console.log(dragMove);
			
			if (dragMove < 1) {
				$("#artwork-wrapper").css("transform", "translateY(-50px)");
				$("#artwork-wrapper").css("opacity", 0);
			}
			if (dragMove > 0 && dragMove < 51) {
				$("#artwork-wrapper").css("transform", "translateY("+parseInt(-50+dragMove)+"px)");
				$("#artwork-wrapper").css("opacity", dragMove/51);
			}
			if (dragMove > 50) { // rubber banding
				$("#artwork-wrapper").css("transform", "translateY("+parseInt(-25+dragMove/2)+"px)");
				$("#artwork-wrapper").css("opacity", 0.99);
			}
		}
	}
	
	// Hide album art.
	if (event.target.id == "now-playing-artwork") {
		event.preventDefault();
		if (event.targetTouches && $("#artwork-wrapper").hasClass("visible")) {
			var touch = event.targetTouches[0];
			dragMove = touch.pageY-dragStart[1];
			//event.preventDefault();
			//console.log(dragMove);
			if (dragMove < -49) {
				$("#artwork-wrapper").css("transform", "translateY(-50px)");
				$("#artwork-wrapper").css("opacity", 0);
			}
			if (dragMove < 0 && dragMove > -51) {
				$("#artwork-wrapper").css("transform", "translateY("+dragMove+"px)");
				$("#artwork-wrapper").css("opacity", 1-dragMove/-51);
			}
			if (dragMove > 0) { // rubber banding
				$("#artwork-wrapper").css("transform", "translateY("+parseInt(dragMove/2)+"px)");
				$("#artwork-wrapper").css("opacity", 0.99);
			}
		}
	}
	
	// Change filter Q. The code is in elements-dsp.js.
	if (event.target.id == "dsp-graph-container") {
		event.preventDefault();
		if (event.targetTouches.length == 2) {
			filterBandwidthGesture(2, event.targetTouches);
		}
	}
	
	// Change ToneTouch spaciousness. The code is in elements-dsp.js.
	if (event.target.id == "tone-touch-scale-area") {
		event.preventDefault();
		if (event.targetTouches.length == 2) {
			toneTouchGesture(2, event.targetTouches);
		}
	}
	
	if (event.target.className.indexOf("hold-menu") != -1) {
		clearTimeout(holdTimeout);
	}
}

document.ontouchend = function(event) {
	/*if (event.target.id == dragTarget) {
		if (dragAndDropDelay) {
			clearTimeout(dragAndDropDelay);
			dragAndDropDelay = null;
		} else {
			$("#"+dragTarget).removeClass("drag");
			
			if (tabsReconfigured) {
				$("#tab-bar").addClass("reorder-moment");
				$("#"+dragTarget).css("transform", "");
				tabsReconfigured = false;
				console.log(dragTabIndex+" moved to "+moveTo+", "+selectedTabIndex+" selected.");
				$("#tab-bar ul li").removeClass("shift-left shift-right");
				
			
				movedTab = configuredTabs[dragTabIndex];
				configuredTabs.splice(dragTabIndex, 1);
				configuredTabs.splice(moveTo, 0, movedTab);
				movedTabIcon = tabIcons[dragTabIndex];
				tabIcons.splice(dragTabIndex, 1);
				tabIcons.splice(moveTo, 0, movedTabIcon);
				
				for (var i = 0; i < 4; i++) {
					$("#tab-bar-item-"+i+" img").attr("src", tabIcons[i]);
				}
				
				localStorage.beoConfiguredTabs = JSON.stringify(configuredTabs);
				localStorage.beoTabIcons = JSON.stringify(tabIcons);
				
				tabBarIndex = configuredTabs.indexOf(selectedTab);
				if (tabBarIndex != -1) { // The selected tab is in the tab bar, highlight it.
					$("#tab-bar ul li").removeClass("selected");
					$("#tab-bar-item-"+tabBarIndex).addClass("selected");
				}
				
				setTimeout(function() {
					$("#tab-bar").removeClass("reorder-moment");
				}, 100);
			} else {
				$("#"+dragTarget).css("transform", "");
			}
		}
	}*/

	// Edge swipes.
	if (event.target.id.indexOf("-edge-swipe") > -1) {
		edgeSwipe(2);
	}
	
	// Show album artwork.
	if (event.target.id == "top-text") {
		$("#artwork-wrapper").css("transform", "");
		$("#artwork-wrapper").css("opacity", "");
		$("#artwork-wrapper").removeClass("drag");
		if (dragMove > 30) {
			$("#artwork-wrapper").addClass("visible");
		}
	}
	
	// Hide album artwork.
	if (event.target.id == "now-playing-artwork") {
		$("#artwork-wrapper").css("transform", "");
		$("#artwork-wrapper").css("opacity", "");
		$("#artwork-wrapper").removeClass("drag");
		if (dragMove < -30) {
			$("#artwork-wrapper").removeClass("visible");
		}
	}
	
	// Change filter Q. The code is in elements-dsp.js.
	if (event.target.id == "dsp-graph-container") {
		filterBandwidthGesture(0);
	}
	
	// Change filter Q. The code is in elements-dsp.js.
	if (event.target.id == "tone-touch-scale-area") {
		toneTouchGesture(0);
	}
	
	if (event.target.className.indexOf("hold-menu") != -1) {
		clearTimeout(holdTimeout);
		//console.log("Cleared hold timeout.");
	}
	
}


// LED TEST

function testLED(red, green, blue, speed) {
	if (!speed) speed = "fast";
	sendToProduct({header: "led", content: {rgb: [red, green, blue], speed: speed}});
}



// MENU TRANSITIONS

function menuTransition(fromScreen, toScreen, direction, edgeSwipeReturnScreen) {
	// Direction: 1 down, 0 up.
	if (!$("#" + toScreen).hasClass("block")) {
		$("#" + toScreen).addClass("block new");
		setTimeout(function() {
			if (direction == 1) {
				$("#" + toScreen).removeClass("hidden-right");
				$("#" + fromScreen).addClass("hidden-left");
				$("#" + toScreen).attr("data-edge-swipe-previous", fromScreen);
			} else {
				$("#" + toScreen).removeClass("hidden-left");
				$("#" + fromScreen).addClass("hidden-right");
			}
		}, 50);
		setTimeout(function() {
			$("#" + fromScreen).removeClass("block");
			$("#" + toScreen).removeClass("new");
		}, 600);
		if (edgeSwipeReturnScreen) {
	
			$("#" + toScreen).attr("data-edge-swipe-previous", edgeSwipeReturnScreen);
		}
		edgeSwipeCurrentScreen = toScreen;
		
		checkTabBarSubmenuSelection();
		
		
		if (direction == 1) {
			
			// Perform actions when moving to a screen.
			switch (toScreen) {
				case "filter-menu":
					loadFilters();
					if (localStorage.filterClipboard) {
						$("#paste-filters-menu-item").removeClass("disabled");
						if (JSON.parse(localStorage.filterClipboard).type == 1) {
							$("#paste-filters-menu-item .menu-label").text("Paste One Filter");
						} else {
							$("#paste-filters-menu-item .menu-label").text("Paste "+(maxFilters-4)+" Filters");
						}
					}
					break;
				case "speaker-role-menu":
					sendToProduct({header: "dsp", content: {operation: "getSpeakerSetup"}});
					break;
				case "sound-preset-menu":
					sendToProduct({header: "dsp", content: {operation: "listCustomPresets"}});
					break;
			}
		} else {
			
		}
	}
}


// EDGE SWIPE GESTURE (á la iOS 7+)

var currentEdgeSwipeTarget = null;
var edgeSwipePreviousScreen = null;
var edgeSwipeCurrentScreen = null;
var edgeSwipeCurrentScreenCache = null;
var edgeSwipePageX = 0;
var edgeSwipePreviousPageX = 0;
var edgeSwipeViewWidth = 0;

function edgeSwipe(stage, pageX, target) {
	/* STAGES:
	0: start edge swipe, determine possibility.
	1: edge swipe in progress, track motion.
	2: end edge swipe, complete transition.
	*/
	if (stage == 0) {
		if ($("#" + edgeSwipeCurrentScreen).attr("data-edge-swipe-previous")) {
			edgeSwipePreviousScreen = $("#" + edgeSwipeCurrentScreen).attr("data-edge-swipe-previous");
		}
		if (edgeSwipePreviousScreen) {
			currentEdgeSwipeTarget = target;
			edgeSwipeViewWidth = $("#" + edgeSwipeCurrentScreen).width();
			$("#" + edgeSwipePreviousScreen).addClass("edge-swipe-screen previous block");
			$("#" + edgeSwipeCurrentScreen).addClass("edge-swipe-screen current");
		}
	} else if (stage == 1) {
		if (edgeSwipePreviousScreen) {
			edgeSwipePreviousPageX = edgeSwipePageX;
			edgeSwipePageX = pageX;
			$("#" + edgeSwipeCurrentScreen).css("transform", "translateX(" + pageX + "px)");
			$("#" + edgeSwipePreviousScreen).css("transform", "translateX(" + ((pageX / 4) - (edgeSwipeViewWidth / 4)) + "px)");
//			$("#" + edgeSwipePreviousScreen).css("filter", "brightness("+(0.5+0.5*(pageX / edgeSwipeViewWidth))+")");
			$("#" + edgeSwipePreviousScreen).css("opacity", 0.5+0.5*(pageX / edgeSwipeViewWidth));
			$("#" + edgeSwipeCurrentScreen + " header .left, #" + edgeSwipeCurrentScreen + " header h1").css("opacity", 0.5 - (pageX / edgeSwipeViewWidth) / 2);
			$("#" + edgeSwipeCurrentScreen + " header .left").css("transform", "translateX(-" + 200 * (pageX / edgeSwipeViewWidth) + "px)");
		}
	} else if (stage == 2) {
		if (edgeSwipePreviousScreen) {
			goToPrevious = false;
			if (edgeSwipePageX - edgeSwipePreviousPageX > 2) { // fast enough
				goToPrevious = true;
			} else if (edgeSwipePageX / edgeSwipeViewWidth > 0.5) { // far enough
				goToPrevious = true;
			}

			$("#" + edgeSwipeCurrentScreen).css("transform", "");
			$("#" + edgeSwipePreviousScreen).css("transform", "");
			$("#" + edgeSwipePreviousScreen).css("filter", "");
			$("#" + edgeSwipePreviousScreen).css("opacity", "");
			$("#" + edgeSwipeCurrentScreen + " header .left, #" + edgeSwipeCurrentScreen + " header h1").css("opacity", "");
			$("#" + edgeSwipeCurrentScreen + " header .left").css("transform", "");
			$("#" + edgeSwipePreviousScreen).removeClass("edge-swipe-screen previous");
			$("#" + edgeSwipeCurrentScreen).removeClass("edge-swipe-screen current");

			if (goToPrevious == true) {
				$("#" + edgeSwipePreviousScreen).removeClass("hidden-left").addClass("new");
				$("#" + edgeSwipeCurrentScreen).addClass("hidden-right swiped-away");
				edgeSwipeCurrentScreenCache = edgeSwipeCurrentScreen;
				setTimeout(function() {
					$("#" + edgeSwipeCurrentScreenCache).removeClass("block swiped-away");
					$("#" + edgeSwipeCurrentScreen).removeClass("new");
				}, 600);
				
				edgeSwipePreviousScreen = null;
				//toggleHelp(false);
				edgeSwipeCurrentScreen = edgeSwipePreviousScreen;
				checkTabBarSubmenuSelection(edgeSwipeCurrentScreen);
			} else {
				setTimeout(function() {
					$("#" + edgeSwipePreviousScreen).removeClass("block");
				}, 600);
			}
		}
	}
}

function checkTabBarSubmenuSelection() {
	// Check if the current screen is as a shortcut in the tab bar.
	theScreen = $("#tab-"+selectedTab+" .menu-screen.block.new").attr("id");
	if (!theScreen) theScreen = $("#tab-"+selectedTab+" .menu-screen.block").attr("id");
	if (theScreen) {
		testPath = (selectedTab + "/" + theScreen);
	} else {
		testPath = null;
	}
	$("#tab-bar ul li").removeClass("selected");
	if (testPath && configuredTabs.indexOf(testPath) != -1) {
		$("#tab-bar-item-"+configuredTabs.indexOf(testPath)).addClass("selected");
	} else {
		//testPath = ($("#tab-"+selectedTab).attr("data-main-menu") + "/" + toScreen);
		//console.log(selectedTab);
		if (configuredTabs.indexOf(selectedTab) != -1) {
			$("#tab-bar-item-"+configuredTabs.indexOf(selectedTab)).addClass("selected");
		} else {
			$("#tab-bar-more").addClass("selected");
		}
	}
}


// SCREEN TABS

function selectScreenTab(group, tab, tabBar, tabItem) {
	$("#"+group+" .screen-tab").addClass("hidden");
	$("#"+tab).removeClass("hidden");
	if (tabBar && tabItem) {
		$("#"+tabBar+" > div").removeClass("selected");
		$("#"+tabItem).addClass("selected");
	}
}


// HELP

var helpVisible = false;

function help(topic) {
	if (topic) {
		ask();
		if (!helpVisible) {
			$(".help-topic").addClass("hidden");
			$("#help-"+topic).removeClass("hidden");
			$("#help").addClass("block");
			setTimeout(function() {
				$("#help").addClass("visible");
				$("#chrome").addClass("disabled");
			}, 100);
			helpVisible = true;
		} else {
			$(".help-topic").addClass("hidden-fade");
			setTimeout(function() {
				$(".help-topic").addClass("hidden");
				$("#help-"+topic).removeClass("hidden");
			}, 500);
			setTimeout(function() {
				$(".help-topic").removeClass("hidden-fade");
			}, 600);
		}
		
	} else {
		$("#chrome").removeClass("disabled");
		$("#help").removeClass("visible");
		setTimeout(function() {
			$("#help").removeClass("block");
		}, 520);
		helpVisible = false;
	}
}


// ASK

var askCallbacks = null;
function ask(menuID, dynamicContent, callbacks) {
	if (menuID) {
		if (callbacks) askCallbacks = callbacks;
		$("#chrome").addClass("disabled");
		$("#ask-menu-content").html($("#"+menuID).html());
		if (dynamicContent) {
			for (var i = 0; i < dynamicContent.length; i++) {
				$(".ask-dynamic-"+i).text(dynamicContent[i]);
			}
		}
		setTimeout(function() {
			$("#ask").addClass("visible");
		}, 100);
	} else {
		$("#chrome").removeClass("disabled");
		$("#ask").removeClass("visible");
		askCallbacks = null;
	}
}

function askOption(callbackIndex) {
	if (askCallbacks) {
		askCallbacks[callbackIndex]();
	}
	ask();
	askCallbacks = null;
}


// FINE ADJUSTMENT

var fineAdjustAddValues = [];
var fineAdjustCallback;
var fineAdjustValues = {value: 0, max: 0, min: 0};
var invertFineAdjustControls = false;
var fineAdjustOffValue = null;
function fineAdjust(add0, add1, add2, minValue, maxValue, startValue, callback, unit, title, invert, offValue) {
	if (add0, add1, add2) {
		if (title) {
			$("#fine-adjust h2 span").text(" "+title);
		} else {
			$("#fine-adjust h2 span").text("");
		}
		if (unit) {
			$("#fine-adjust h2 div").text(" "+unit);
		} else {
			$("#fine-adjust h2 div").text("");
		}
		fineAdjustValues.value = startValue;
		fineAdjustValues.max = maxValue;
		fineAdjustValues.min = minValue;
		fineAdjustCallback = callback;
		fineAdjustAddValues = [add0, add1, add2];
		if (!invert) {
			invertFineAdjustControls = false;
			for (var i = 0; i < 3; i++) {
				$("#fine-adjust .add-"+i).text("+"+fineAdjustAddValues[i]);
				$("#fine-adjust .substract-"+i).text("–"+fineAdjustAddValues[i]);
			}
		} else {
			invertFineAdjustControls = true;
			for (var i = 0; i < 3; i++) {
				$("#fine-adjust .substract-"+i).text("+"+fineAdjustAddValues[i]);
				$("#fine-adjust .add-"+i).text("–"+fineAdjustAddValues[i]);
			}
		}
		if (offValue) {
			fineAdjustOffValue = offValue;
		} else {
			fineAdjustOffValue = null;
		}
		if (offValue && offValue == startValue) {
			$("#fine-adjust-value span").text("Off");
		} else {
			$("#fine-adjust-value span").text(startValue);
		}
		$("#fine-adjust-value div").text(unit);
		$("#chrome").addClass("disabled");
		$("#fine-adjust").addClass("visible");
	} else {
		$("#chrome").removeClass("disabled");
		$("#fine-adjust").removeClass("visible");
		fineAdjustCallback = null;
	}
}

function fineAdjustChange(add, buttonIndex) {
	theValue = fineAdjustValues.value;
	console.log(fineAdjustAddValues[buttonIndex]);
	if (add && !invertFineAdjustControls) goUp = true;
	if (add && invertFineAdjustControls) goUp = false;
	if (!add && invertFineAdjustControls) goUp = true;
	if (!add && !invertFineAdjustControls) goUp = false;
	if (goUp) {
		theValue = theValue*1000+fineAdjustAddValues[buttonIndex]*1000;
		if (theValue > fineAdjustValues.max*1000) theValue = fineAdjustValues.max*1000;
	} else {
		theValue = theValue*1000-fineAdjustAddValues[buttonIndex]*1000;
		if (theValue < fineAdjustValues.min*1000) theValue = fineAdjustValues.min*1000;
	}
	fineAdjustValues.value = theValue/1000;
	if (fineAdjustOffValue && theValue/1000 == fineAdjustOffValue) {
		$("#fine-adjust-value span").text("Off");
	} else {
		$("#fine-adjust-value span").text(theValue/1000);
	}
	if (fineAdjustCallback) fineAdjustCallback(theValue/1000);
}



// CONTEXTUAL MENU (hold)


var holdActionActivated = false;
var holdTarget = null;
var holdPosition = [];
var holdTimeout = null;
var clickHandler = null;

// Drag detector cancels the appearance of the contextual menu in case the user moves away from the target whilst holding down.
$( ".no-touch .hold-menu" ).draggable({
	//cursorAt: { top: 0, left: 0 },
	//delay: 500,
	scroll: false,
	helper: function( event ) {
	return $( "<div class='ui-widget-header' style='display: none;'></div>" );
	},
	start: function( event, ui ) {
		
	},
	stop: function( event, ui ) {
		/*if (holdActionActivated) {
			if (clickHandler) {
				console.log("Restoring click handler (drag stop)");
				$(holdTarget).attr('onclick', clickHandler);
				clickHandler = null;
			}
		} else {*/
			clearTimeout(holdTimeout);
		//}
		//holdActionActivated = false;
		//console.log("holdActionActivated = false");
	},
	drag: function( event, ui ) {
		//if (!holdActionActivated) {
			clearTimeout(holdTimeout);
			//console.log("Cleared hold");
		//}
	}
});

$( ".hold-menu" ).mousedown(function(event) {
	//console.log("Hold start");
	startHold(this, event);
});

function startHold(target, event) {
	clickHandler = null;
	holdTarget = target;
	if (event.targetTouches) {
		holdPosition = [event.targetTouches[0].pageX, event.targetTouches[0].pageY];
	} else {
		holdPosition = [event.pageX, event.pageY];
	}
	holdTimeout = setTimeout(function() {
		//holdActionActivated = true;
		if ($(holdTarget).attr('onclick')) {
			clickHandler = $(holdTarget).attr('onclick');
			$(holdTarget).removeAttr('onclick');
		}
		//console.log("Show contextual menu");
		//console.log(holdPosition);
		contextMenu(holdPosition, holdTarget, $(holdTarget).attr("data-hold"));
	}, 500);
}

$( ".hold-menu" ).mouseup(function() {
	//console.log("Hold end");
	clearTimeout(holdTimeout);
	/*if (holdActionActivated) {
		holdActionActivated = false;
		//console.log("holdActionActivated = false");
		if (clickHandler) {
			setTimeout(function() {
				if (clickHandler) {
					console.log("Restoring click handler (mouse up)");
					$(holdTarget).attr('onclick', clickHandler);
					clickHandler = null;
				}
			}, 10);
		}
	}*/
});

function contextMenu(origin, target, holdData, dynamicContent) {
	if (origin) { // Show a menu.
		$("#context-menu").css("top", origin[1]-70+"px");
		$(".context-menu-content").removeClass("visible");
		// Use the holdData variable to determine who should return the right menu, then display the menu.
		menu = null;
		//console.log(holdData);
		switch (holdData) {
			case "filter-copy-paste":
				menu = getFilterCopyPasteMenu(target);
				break;
		}
		if (menu) {
			$(".context-menu-content."+menu).addClass("visible");
			$("#context-menu").css("left", 0);
			// Calculate the horizontal position of the menu. Try to center it with the finger, but if not, align it with the screen edge.
			setTimeout(function() {
				menuWidth = document.getElementById("context-menu").offsetWidth;
				if (menuWidth/2 <= origin[0]-10 && menuWidth/2 <= windowWidth-(origin[0]+10)) {
					// Menu can be comfortably centered with the finger.
					$("#context-menu").css("left", origin[0]-menuWidth/2+"px");
				} else if (menuWidth/2 > origin[0]-10) {
					// Too close to the left
					$("#context-menu").css("left", "10px");
				//} else if (menuWidth/2 <= windowWidth-origin[0]-10) {
				} else {
					// Too close to the right
					$("#context-menu").css("left", windowWidth-menuWidth-10+"px");
				}
				//console.log(menuWidth);
				$("#context-menu-overlay").addClass("visible");
			}, 20);
			
		}
	} else { // Close the menu.
		$("#context-menu-overlay").removeClass("visible");
		
		if (clickHandler) {
			$(holdTarget).attr('onclick', clickHandler);
			clickHandler = null;
		}
	}
}

// NOTIFY

var notifyTimeout = null;
function notify(notification, finePrint, icon, persistent) {
	if (notification === false) {
		$("#notify").removeClass("visible");
		setTimeout(function() {
			$("#notify img").removeClass("load-animate");
		}, 520);
	} else {
		if (icon) {
			if (icon != "load") {
				$("#notify img").removeClass("load-animate");
				$("#notify img").attr("src", "symbols/"+icon+".svg");
			} else {
				$("#notify img").attr("src", "symbols/load.svg");
				$("#notify img").addClass("load-animate");
			}
		} else {
			$("#notify img").attr("src", "symbols/notification.svg")
		}

		$("#notify p").empty();
		if (finePrint) $("#notify p").text(finePrint);
		$("#notify h1").text(notification);

		if (notifyTimeout) clearTimeout(notifyTimeout);
		notifyTimeout = null;
		setTimeout(function() {
			$("#notify").addClass("visible");
		}, 20);
		if (!persistent) {
			notifyTimeout = setTimeout(function() {
				$("#notify").removeClass("visible");
				setTimeout(function() {
					$("#notify img").removeClass("load-animate");
				}, 520);
			}, 2000);
		}
	}
}



// TEXT INPUT

var textInputCallback;
var textInputMode = 0;
var textInputOptions;

function startTextInput(type, title, prompt, options, callback) {
	
	$("#text-input").addClass("visible").removeClass("text password");
	$("#chrome").addClass("disabled");
	$("#text-input-submit").addClass("disabled");
	
	textInputMode = type;
	if (type == 1) $("#text-input").addClass("text");
	if (type == 2) $("#text-input").addClass("password");
	if (type == 3) $("#text-input").addClass("text password");
	
	textInputOptions = options;
	if (options.placeholders.text) $("#text-input input[type=text]").attr("placeholder", options.placeholders.text);
	if (options.placeholders.password) $("#text-input input[type=password]").attr("placeholder", options.placeholders.password);
	
	$("#text-input input[type=text], #text-input input[type=password]").val("");
	
	$("#text-prompt").text(prompt);
	$("#text-input h1").text(title);
	textInputCallback = callback;
	
//	setTimeout(function() {
//		$("#text-input").removeClass("bottom").addClass("visible");
//	}, 20);
//	setTimeout(function() {
//		$("#chrome").addClass("at-background");
//	}, 520);
}

var textInputValid = false;
function validateTextInput() {
	textInputValid = true;
	txt = $("#text-input input[type=text]").val();
	passwd = $("#text-input input[type=password]").val();
	if (textInputMode == 1 || textInputMode == 3) {
		if (!txt) textInputValid = false;
		if (textInputOptions.minLength && textInputOptions.minLength.text) {
			if (txt.length < textInputOptions.minLength.text) textInputValid = false;
		}
	}
	if (textInputMode == 2 || textInputMode == 3) {
		if (textInputOptions.optional && textInputOptions.optional.password) {
			if (textInputOptions.minLength.password && passwd != "") {
				if (passwd.length < textInputOptions.minLength.password) textInputValid = false;
			}
		} else {
			if (!passwd) textInputValid = false;
			if (textInputOptions.minLength.password) {
				if (passwd.length < textInputOptions.minLength.password) textInputValid = false;
			}
		}
	}
	if (textInputValid) {
		$("#text-input-submit").removeClass("disabled");
	} else {
		$("#text-input-submit").addClass("disabled");
	}
}

function submitText() {
	if (textInputValid) {
		txt = $("#text-input input[type=text]").val();
		passwd = $("#text-input input[type=password]").val();
		cancelText();
		textInputCallback({text: txt, password: passwd});
		return true;
	} else {
		return false;	
	}
}


function cancelText() {
	$("#text-input input[type=text], #text-input input[type=password]").blur();
	$("#text-input").addClass("bottom").removeClass("visible");
	$("#chrome").removeClass("disabled");
//	$("#chrome").removeClass("at-background");
//	setTimeout(function() {
//		$("#text-input").removeClass("block");
//	}, 520);
}

generatedHostname = "";
systemName = "";
$('input').bind('input propertychange', function() {
    if ($(this).attr("id") == "text-input-plain") validateTextInput();
	if ($(this).attr("id") == "text-input-password") validateTextInput();
	
	if ($(this).attr("class") == "text-input-system-name") {
		generatedHostname = generateHostname($(this).val());
		systemName = $(this).val();
		$(".system-name-input-hostname").text(generatedHostname+".local");
		if ($(this).val()) {
			$(".system-name-input-hostname-string").removeClass("hidden");
			if (currentSetupStep != null) allowAdvancingToStep = 4;
		} else {
			$(".system-name-input-hostname-string").addClass("hidden");
			if (currentSetupStep != null) allowAdvancingToStep = 3;
		}
		if (currentSetupStep != null) checkIfAllowsNextStep();
	}
	
	if ($(this).attr("id") == "volume-limit-slider") setVolumeLimit($(this).val());
});



// DELETE ITEMS
// Enables iOS-like 'swipe to reveal delete button', or reveals the button by tapping the trash can icon (actually the whole menu item but that's what you want them to think).

var cachedDeleteMenuItem = null;
function showDeleteButton(forMenuItem) {
	if (forMenuItem) {
		if (cachedDeleteMenuItem) {
			$(cachedDeleteMenuItem).css("transform", "");
			$(cachedDeleteMenuItem).removeClass("swipe-delete-visible");
		}
		deleteWidth = Math.floor(document.querySelector(forMenuItem+" .swipe-delete-button").offsetWidth);
		$(forMenuItem).css("transform", "translateX(-"+deleteWidth+"px)");
		$(forMenuItem).addClass("swipe-delete-visible");
		cachedDeleteMenuItem = forMenuItem;
	} else {
		if (cachedDeleteMenuItem) {
			$(cachedDeleteMenuItem).css("transform", "");
			$(cachedDeleteMenuItem).removeClass("swipe-delete-visible");
			cachedDeleteMenuItem = null;
		}
	}
}


function generateHostname(readableName) {
	n = readableName.toLowerCase(); // Convert to lower case
	n = removeDiacritics(n); // Remove diacritics
	n = n.replace(" ", "-"); // Replace spaces with hyphens
	n = n.replace(/[^\w\-]|_/g, ""); // Remove non-alphanumeric characters except hyphens
	n = n.replace(/-+$/g, ""); // Remove hyphens from the end of the name.
	return n; //+".local"; // Add .local
}

// Converts from degrees to radians.
Math.radians = function(degrees) {
	return degrees * Math.PI / 180;
};

Math.distance = function(x1, y1, x2, y2) {
	return Math.sqrt((x2 -= x1) * x2 + (y2 -= y1) * y2);
};

// OTHER SUPPORTING FUNCTIONS

// encode or decode UTF8 (used with displaying Wi-Fi network names)
function encodeUTF8(s) {
	return unescape(encodeURIComponent(s));
}

function decodeUTF8(s) {
	return decodeURIComponent(escape(s));
}

// decode hex escape sequence
String.prototype.decodeEscapeSequence = function() {
	return this.replace(/\\x([0-9A-Fa-f]{2})/g, function() {
		return String.fromCharCode(parseInt(arguments[1], 16));
	});
};