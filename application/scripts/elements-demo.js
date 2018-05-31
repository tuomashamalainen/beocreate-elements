var pixelScaleFactor = 3;


var wallDimensionsMillimetres = [1000, 1000];
var wallDimensionsCentimetres = [100, 100];
var wallDimensionsPixels = [333, 333];

var pegboard = false;

function togglePegboard() {
	if (!pegboard) {
		$("#pegboard-toggle").addClass("on");
		$("#wall-pegboard").removeClass("hidden");
		pegboard = true;
	} else {
		$("#pegboard-toggle").removeClass("on");
		$("#wall-pegboard").addClass("hidden");
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
	
	$("#speaker-height .value").text(boxDimensionsCentimetres[1]);
	$("#speaker-width .value").text(boxDimensionsCentimetres[0]);
	
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