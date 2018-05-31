// BANG & OLUFSEN
// Elements

function metadataReceiver(content) {
	if (content.artist) {
		//$("#top-text h2").text(content.artist);
		topText(true, content.artist);
	}
	if (content.title) {
		//$("#top-text h1").text(content.title);
		topText(content.title, true);
	}
	if (content.picture) {
		$(".artwork-bg").css("background-image", "url(data:image/png;base64," + content.picture + ")");
		$(".artwork-img").attr("src", "data:image/png;base64," + content.picture);
	}
}

function playbackReceiver(content) {
	if (content.volume) {
		if (content.volume == -1) {
		
		} else {
			volumeAngle = convertVolume(content.volume, 0);
			drawArc(2, 0, 360, 0);
			drawArc(1, 0, volumeAngle, false);
		}
	}
}

// NOW PLAYING


// MANAGE AND SWITCH TOP TEXT AND BANG & OLUFSEN LOGO

var previousFirstRow = "";
var previousSecondRow = "";
var topTextActionName = null;
var tempTopTextTimeout;
var topTextNotifyTimeout;
var newFirstRow = "";
var newSecondRow = "";

function topText(firstRow, secondRow, temp) {
	/* Value interpretation
    text: change text to this
    true: use previous text
    false: clear text
	
    temp:
    If true, the text is temporary. Whatever was displayed before the temporary display will be returned after the temporary text display ends. If any text is sent as "non-temporary" whilst the temporary text is being displayed, it will be stored in the "previous" values and displayed after the temporary text display ends.
    */
	if (firstRow == true) {
		newFirstRow = previousFirstRow;
	} else if (firstRow == false) {
		newFirstRow = "";
	} else {
		newFirstRow = firstRow;
	}

	if (secondRow == true) {
		newSecondRow = previousSecondRow;
	} else if (secondRow == false) {
		newSecondRow = "";
	} else {
		newSecondRow = secondRow;
	}

	if (!temp) {
		previousFirstRow = newFirstRow;
		previousSecondRow = newSecondRow;
	} else if (temp == true) {
		//clearTimeout(tempTopTextTimeout);
		tempTopTextTimeout = null;
	}


	if (!tempTopTextTimeout) {



		if (newFirstRow == "" && newSecondRow == "") { // Both rows are empty, show Bang & Olufsen logo.
			$("#top-text").addClass("logo").removeClass("one-row");
			evaluateTextScrolling(false);
		} else if (newFirstRow != "" && newSecondRow == "") { // Second row is empty, hide it.
			$("#top-text h1").text(newFirstRow).attr("data-content", newFirstRow);
			//$("#top-text .second-row").text(newSecondRow).attr("data-content", newSecondRow);
			$("#top-text").addClass("one-row").removeClass("logo");
			evaluateTextScrolling();
		} else { // Both rows have text, show them.
			$("#top-text h1").text(newFirstRow).attr("data-content", newFirstRow);
			$("#top-text h2").text(newSecondRow).attr("data-content", newSecondRow);
			$("#top-text").removeClass("logo one-row");
			evaluateTextScrolling();
			clearTimeout(topTextNotifyTimeout);
			/*topTextNotifyTimeout = setTimeout(function() {
				tabBarNotify("now-playing", newFirstRow, newSecondRow);
			}, 100);*/
		}

		if (temp == true) {
			tempTopTextTimeout = setTimeout(function() {

				tempTopTextTimeout = null;
				topText(previousFirstRow, previousSecondRow);
			}, 2000);
		}
	}
}


var textScrollElements = ["#top-text h1", "#top-text h2"];
var textScrollCompareElements = ["#top-text .h1-wrap", "#top-text .h2-wrap"];
var textScrollIntervals = [];
var textScrollTimeouts = [];
var preventTextScrolling = false;

var textScrollSetupDelay;

function evaluateTextScrolling(flag) {
	// Checks whether text overflows the fields and sets up scrolling.
	// Reset
	for (var i = 0; i < textScrollElements.length; i++) {
		$(textScrollElements[i]).removeClass("scrolling-text");
		$(textScrollElements[i]).css("-webkit-transition-duration", "0s");
		$(textScrollElements[i]).css("-webkit-transform", "translateX(0)");

		clearTimeout(textScrollTimeouts[i]);
		clearInterval(textScrollIntervals[i]);
	}
	if (flag == 2) {
		preventTextScrolling = true;
	} else if (flag == 1) {
		preventTextScrolling = false;
	}
	if (preventTextScrolling == false && flag != false && selectedTab == "now-playing") {

		clearTimeout(textScrollSetupDelay);
		textScrollSetupDelay = setTimeout(function() {
			// timeout to prevent funny things happening when all labels have not yet received new text.
			// Get widths

			// iterate through elements
			for (var i = 0; i < textScrollElements.length; i++) {
				textContainerWidth = $(textScrollCompareElements[i]).width();
				textWidth = $(textScrollElements[i])[0].scrollWidth;
				
				console.log(textWidth, textContainerWidth);
				if (textWidth > textContainerWidth) {
					createTextScroller(i, textWidth);
				}
			}
		}, 500);

	}
}

function createTextScroller(i, textWidth) {
	// initial run
	textScrollTimeouts[i] = setTimeout(function() {
		$(textScrollElements[i]).css("transition-duration", (textWidth) * 0.03 + "s");
		$(textScrollElements[i]).addClass("scrolling-text");
		$(textScrollElements[i]).css("transform", "translateX(-" + (textWidth + 30) + "px)");
		// the interval takes over subsequent runs
		intervalDelay = textWidth * 30 + 3000;
		textScrollIntervals[i] = setInterval(function() {
			$(textScrollElements[i]).removeClass("scrolling-text");
			$(textScrollElements[i]).css("transition-duration", "0s");
			$(textScrollElements[i]).css("transform", "translateX(0)");
			setTimeout(function() {
				$(textScrollElements[i]).css("transition-duration", (textWidth) * 0.03 + "s");
				$(textScrollElements[i]).addClass("scrolling-text");
				$(textScrollElements[i]).css("transform", "translateX(-" + (textWidth + 30) + "px)");
			}, 20);
		}, intervalDelay);
	}, 3000);
}



// ARC FUNCTIONS

var w = 600;
var h = 600;
var controllerCanvas;
var toolbarCanvas;
var ctxA;
var ctxB;

function setupCanvases() {
	if (!controllerCanvas) {
		controllerCanvas = document.getElementById('controller-canvas');
		ctxA = controllerCanvas.getContext('2d');

		//toolbarCanvas = document.getElementById('toolbar-canvas');
		//ctxC = toolbarCanvas.getContext('2d');
	}
}

function drawArc(arcType, start, end, counterClockwise) {

	switch (arcType) {
		case 0: // Dashed line
			radius = 210;
			lineWidth = 10;
			lineDash = [0, 15];
			colour = "rgba(255,255,255,0.5)";
			lineCap = "round";
			eraseFirst = false;
			break;
		case 1: // Solid line
			radius = 210;
			lineWidth = 20;
			colour = "#fff";
			lineDash = [];
			lineCap = "round";
			eraseFirst = false;
			break;
		case 2: // Solid thin line
			radius = 210;
			lineWidth = 8;
			colour = "rgba(255,255,255,0.3)";
			lineDash = [];
			lineCap = "butt";
			eraseFirst = true;
			break;
	}

	x = w / 2;
	y = h / 2;
	startAngle = Math.radians(start + 90);
	endAngle = Math.radians(end + 90);
	
	if (eraseFirst) {
		// Erase previous arc from the same area
		ctxA.globalCompositeOperation = "destination-out";
		ctxA.beginPath();
		ctxA.arc(x, y, radius, 0, 2 * Math.PI, false);
		ctxA.lineWidth = 22;
		//ctxB.setLineDash([]);
		ctxA.strokeStyle = "black";
		ctxA.stroke();
	}

	// Draw new arc
	ctxA.globalCompositeOperation = "source-over";

	ctxA.lineWidth = lineWidth;
	ctxA.lineCap = lineCap;
	//ctxB.setLineDash(lineDash);

	// line color
	ctxA.strokeStyle = colour;
	ctxA.beginPath();
	ctxA.arc(x, y, radius, startAngle, endAngle, counterClockwise);
	ctxA.stroke();
}

// MATH STUFF

function convertVolume(value, conversionType) {
	if (conversionType == 0) { // Convert from 0-90 to angle.
		return (value / 90) * 360;
	}

	if (conversionType == 1) { // Convert from angle to 0-90.
		return (value / 360) * 90;
	}
}
/* Old volume conversion function, before volume control was abstracted for clients.
function convertVolume(value, conversionType) {
	if (conversionType == 0) { // Convert from dB (-30 to 0) to angle.
		return (1 - (value / -30)) * 360;
	}
	
	if (conversionType == 1) { // Convert from angle to dB (-30 to 0).
		return -30 + ((value / 360) * 30);
	}
}*/

function calculateDistance(pointX, pointY, mouseX, mouseY) {
	return Math.floor(Math.sqrt(Math.pow(mouseX - pointX, 2) + Math.pow(mouseY - pointY, 2)));
}

function calculateAngle(pointX, pointY, mouseX, mouseY) {
	y = pointX - mouseX;
	x = pointY - mouseY;
	theta = Math.atan2(-y, x);
	theta = theta * 1;
	theta = theta * (180 / Math.PI);
	theta = theta - 180;
	if (theta < 0) {
		theta = 360 + theta;
	}

	return theta;
	//return theta.toFixed(1);
}