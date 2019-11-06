// BANG & OLUFSEN
// BeoCreate Elements
// 4-Channel Filter Response Grapher
// Can draw filter response (magnitude and phase) graphs for four independent channels. Dependencies: Flotr2, JSDSP


/*

BEOGRAPHER
A new grapher function that can have multiple instances and thus support multiple graphs within the same application.

new BeoGrapher (initialise a new grapher object)
	Expects the following arguments:
	* The ID of the magnitude response graph container [string]
	* The ID of the phase response graph container [string] (optional: supply null to not use it)
	* Up to 4 colours, also used to indicate the amount of channels [array: hex colour values as strings]
	* A colour for the grid lines [string: any standard CSS colour definition].
	
	Example:
	var graph1 = new BeoGrapher("magContainer", "phaseContainer", ["#FF3E46", "#FFAA46","#2CD5C4", "#2C7FE4"], "rgba(255,255,255,0.05)");

There are two ways to feed filter information into the grapher and two ways to draw it:
	* BeoGrapher.store -> used to store information and generate the graphs behind the scenes.
	* BeoGrapher.draw -> used to draw the requested filter(s).
	* BeoGrapher.storeAndDraw -> a combination of above functions.
	
BeoGrapher.store
	Expects the following arguments:
	* Channel index [integer]
	* Filter index within the channel [integer]
	* Filter coefficients [array]
	* Inverted: is the phase of the channel inverted? [boolean]
	-> To speed up drawing when phase is inverted but the filter remains otherwise unchanged, supply only the channel index and 'inverted' boolean. Supply null to the other arguments.

BeoGrapher.draw
	Expects the following arguments:
	* Channel index to draw [integer] (optional: supply null to draw all channels with equal prominence)
	* Filter index within the channel to draw [integer] (optional: supply null to not highlight individual filters)
	* Graph to draw [integer] (optional: 0 to draw both magnitude and phase responses, 1 to draw magnitude response only, 2 to draw phase response only)
	
BeoGrapher.storeAndDraw
	Expects the arguments from both BeoGrapher.store and BeoGrapher.draw, in the same order.
	
	


*/


function BeoGrapher(magnitudeGraphContainer, phaseGraphContainer, colours, gridColour) {
	this.graphCount = colours.length; // Amount of graphs
	
	// Create palette
	this.filterGraphPalette = colours;
	this.filterGraphPaletteFaded = [];
	this.phaseGraphPalette = [];
	this.phaseGraphPaletteFaded = [];
	for (var i = 0; i < this.graphCount; i++) {
		rgbValues = hexToRGB(filterGraphPalette[i]);
		rgbaBase = "rgba("+rgbValues.r+","+rgbValues.g+","+rgbValues.b+",";
		this.filterGraphPaletteFaded.push(rgbaBase+"0.5)");
		this.phaseGraphPalette.push(rgbaBase+"0.4)");
		this.phaseGraphPaletteFaded.push(rgbaBase+"0.2)");
	}
	
	// Initialise arrays for coefficients and graph points
	this.filterCoeffs = [];
	
	this.filterGraphs = [];
	this.phaseGraphs = [];
	this.masterFilterGraphs = [];
	this.masterPhaseGraphs = [];
}


var filterCoeffs = [];

var filterGraphs = [];
var phaseGraphs = [];
var masterFilterGraphs = [];
var masterPhaseGraphs = [];


// GRAPH OPTIONS
var graphLength = 256;
var dpRatio = window.devicePixelRatio;

var filterGraphPalette = ["#FF3E46", "#FFAA46","#2CD5C4", "#2C7FE4"];
var fadedFilterGraphPalette = ["rgba(255, 62, 70, 0.5)", "rgba(255, 170, 70, 0.5)", "rgba(44, 213, 196, 0.5)", "rgba(44, 127, 228, 0.5)"];
var phaseGraphPalette = ["rgba(255, 62, 70, 0.4)", "rgba(255, 170, 70, 0.4)", "rgba(44, 213, 196, 0.4)", "rgba(44, 127, 228, 0.4)"];
var fadedPhaseGraphPalette = ["rgba(255, 62, 70, 0.2)", "rgba(255, 170, 70, 0.2)", "rgba(44, 213, 196, 0.2)", "rgba(44, 127, 228, 0.2)"];

var xOptions = {scaling: "logarithmic", base: 10, ticks: [[100, "100"], [1000, "1k"], [10000, "10k"]], minorTicks: [20,30,40,50,60,70,80,90,200,300,400,500,600,700,800,900,2000,3000,4000,5000,6000,7000,8000,9000], min: 10, max: 20000, showLabels: false, margin: false};
var xBackOptions = {scaling: "logarithmic", base: 10, noTicks: 0, min: 10, max: 20000, showLabels: false, margin: false};
var yOptions = {showLabels: false, max: 15, min: -15, margin: false, ticks: [[10, "+10"], [5, ""], [0, "0"], [-5, ""], [-10, "-10"]]};
var y2Options = {showLabels: false, max: mathPI, min: -mathPI, margin: false, noTicks: 0};
var yBackOptions = {showLabels: false, max: mathPI, min: -mathPI, margin: false, noTicks: 0};
var gridOptions = {tickColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", outlineWidth: 0, labelMargin: 0}; // On dark
//var gridOptions = {tickColor: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.5)", outlineWidth: 0, labelMargin: 0}; // On light

var magLineWidth = 1.5;
var phaseLineWidth = 1;

// GRAPHER

var emptyGraph = [];

function resetGraphs(Fs) {
	emptyGraph = [];
	for (var i = 0; i < graphLength; i++) { // Generate an empty graph
		freq = logScale(i / graphLength, 0.0001, 0.5);	
		emptyGraph.push([freq * Fs, 0]);	
	}
	for (var c = 0; c < 4; c++) { // Loop through channels
		filterGraphs[c] = [];
		phaseGraphs[c] = [];
		filterCoeffs[c] = [];
		for (var f = 0; f < maxFilters; f++) { // Loop through filters
			filterGraphs[c].push(emptyGraph);
			phaseGraphs[c].push(emptyGraph);
			filterCoeffs[c].push([1,0,0,1,0,0]);
		}
		masterFilterGraphs.push(emptyGraph);
		masterPhaseGraphs.push(emptyGraph);
	}
	//drawPhaseResponse();
	//drawMagnitudeResponse();
}


function loadTestGraphs() {
	resetGraphs(48000);
	//filter(0, 0, "hp", getRandomInt(100, 1000), -4, getRandom(0.7, 2));
	//filter(1, 0, "hp", getRandomInt(100, 1000), -4, getRandom(0.7, 2));
	//filter(2, 0, "lp", getRandomInt(100, 1000), -4, getRandom(0.7, 2));
	//filter(3, 0, "lp", getRandomInt(100, 1000), -4, getRandom(0.7, 2));
	channels = [];
	for (var c = 0; c < 4; c++) { // Loop through channels
		channels.push({filters: [], crossover: {}});
		for (var f = 4; f < maxFilters; f++) { // Loop through filters
			filters = {};
			filters.Fc = 1000;
			filters.Q = 0.7;
			filters.boost = 0;
			filters.gain = 0;
			filters.enabled = true;
			channels[c].filters.push(filters);
		}
		channels[c].crossover = {hp: null, lp: null};
	}
	//filter(0, 2, "peak", getRandomInt(80, 11000), getRandomInt(-10, 10), getRandom(0.7, 2));
	//filter(1, 2, "peak", getRandomInt(80, 11000), getRandomInt(-10, 10), getRandom(0.7, 2));
	//filter(2, 2, "peak", getRandomInt(100, 1000), -4, getRandom(0.7, 2));
	//filter(3, 2, "peak", getRandomInt(80, 11000), getRandomInt(-10, 10), getRandom(0.7, 2));
	
	drawMagnitudeResponse();
	drawPhaseResponse();
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}

function getRandom(min, max) {
    return (Math.random() * (max - min) ) + min;
}

/*
function invertChannel(channel) {
	if (polarity[channel] == 0) { 
		// Invert
		polarity[channel] = 1;
	} else {
		// Normal
		polarity[channel] = 0;
	}
	generateMasterGraphs(channel);
	drawPhaseResponse(channel);
	drawMagnitudeResponse(channel);
}*/


function clearFilter(channel, filter) {
	//console.log("Cleared filter "+filter+" of channel "+channel+".");
	filterGraphs[channel][filter] = emptyGraph;
	phaseGraphs[channel][filter] = emptyGraph;
	filterCoeffs[channel][filter] = [1,0,0,1,0,0];
	generateMasterGraphs(channel);
}

function createFilter(channel, filter, type, center, boost, Q, enabled) {
	if (enabled) {
		switch (type) {
			case "hp": // high-pass
				coeffs = highPass(sampleRate, center, 0);
				break;
			case "lp": // low-pass
				coeffs = lowPass(sampleRate, center, 0);
				break;
			case "peak": // peak
				coeffs = peak(sampleRate, center, boost, Q, 0);
				break;
		}
		filterCoeffs[channel][filter] = coeffs;
		generateGraph(channel, filter, sampleRate);
	} else {
		filterCoeffs[channel][filter] == [1,0,0,1,0,0];
		filterGraphs[channel][filter] = emptyGraph;
		phaseGraphs[channel][filter] = emptyGraph;
	}
	
	generateMasterGraphs(channel);
	//drawMagnitudeResponse(channel, filter);
	//drawPhaseResponse(channel);
	//lastFilter = filter;
}



function generateGraph(channel, filter, Fs) {
	coeffs = filterCoeffs[channel][filter];
	
	a0 = coeffs[0];
	a1 = coeffs[1];
	a2 = coeffs[2];
	b0 = coeffs[3];
	b1 = coeffs[4];
	b2 = coeffs[5];
	
	
	filterGraphs[channel][filter] = [];
	phaseGraphs[channel][filter] = [];
	for (var i = 0; i < graphLength; i++) {
		freq = logScale(i / graphLength, 0.0001, 0.5);
		//console.log(freq);
		z = freq*Fs;
		// math.js implementation:
		c0 = math.complex(0,-0 * freq * 2 * mathPI);
		c1 = math.complex(0,-1 * freq * 2 * mathPI);
		c2 = math.complex(0,-2 * freq * 2 * mathPI);
		res0 = math.multiply(b0, math.exp(c0));
		res0 = math.add(res0, math.multiply(b1, math.exp(c1)));
		res0 = math.add(res0, math.multiply(b2, math.exp(c2)));
		resP = math.multiply(a0, math.exp(c0));
		resP = math.add(resP, math.multiply(a1, math.exp(c1)));
		resP = math.add(resP, math.multiply(a2, math.exp(c2)));
		response = math.divide(res0, resP);

		// Simplified (faster) implementation:
//		zeros = b0 + b1 * Math.pow(z, -1) + b2 * Math.pow(z, -2);
//		poles = 1 + -1*a1 * Math.pow(z, -1) + -1*a2 * Math.pow(z, -2);
//		resN = zeros / poles;
//		console.log(resN);
		
 		
		var tempMag = math.abs(response);
		if (tempMag == 0)
			tempMag = -300;
		else
			tempMag = 20 * Math.log10(tempMag);
		
		filterGraphs[channel][filter].push([freq * Fs, tempMag]);
		
		// Phase
		phaseGraphs[channel][filter].push([freq * Fs, math.atan2(response.im, response.re)]);
	}
	
}

function generateMasterGraphs(channel) {
	// Generate the combined graphs from individual graphs
	masterFilterGraphs[channel] = [];
	masterPhaseGraphs[channel] = [];
		
	for (var i = 0; i < graphLength; i++) {
		plotPoint = 0;
		plotPhasePoint = 0;
		plotFreq = null;
		for (var a = 0; a < maxFilters; a++) {
			if (filterGraphs[channel][a]) {
				plotFreq = filterGraphs[channel][a][i][0];
				plotPoint += filterGraphs[channel][a][i][1];
				plotPhasePoint += phaseGraphs[channel][a][i][1];
			}
		}
		masterFilterGraphs[channel].push([plotFreq, plotPoint]);

		if (channels[channel].invert == 1) { // Polarity is inverted
			plotPhasePoint+= mathPI;
		}
		if (plotPhasePoint > mathPI) plotPhasePoint-= 2*mathPI;
		if (plotPhasePoint < -mathPI) plotPhasePoint+= 2*mathPI;
		
		masterPhaseGraphs[channel].push([plotFreq, plotPhasePoint]);
		
		// Cut the phase graph so there aren't vertical lines going across the graph
		if (i) {
			if (Math.abs(masterPhaseGraphs[channel][i-1][1] - masterPhaseGraphs[channel][i][1]) > 0.5 && masterPhaseGraphs[channel][i-1][1] != null) {
				masterPhaseGraphs[channel][i][1] = null;
			}
		}
	}
}

function logScale(value, min, max) {
	return Math.pow(2, Math.log(max / min) / Math.LN2 * value) * min;
}





function drawPhaseResponse(channel) {
	palette = [];
	if (channel != undefined) { // draw the response of a single filter
		palette = fadedPhaseGraphPalette.slice(0);
		palette[channel] = phaseGraphPalette[channel];
	} else { // draw the combined response of all filters*/
		palette = phaseGraphPalette.slice(0);
		
	}
	
	Flotr.draw(document.getElementById('dsp-graph-container-back'), [
		{data: masterPhaseGraphs[0], lines: {lineWidth: phaseLineWidth}},
		{data: masterPhaseGraphs[1], lines: {lineWidth: phaseLineWidth}},
		{data: masterPhaseGraphs[2], lines: {lineWidth: phaseLineWidth}},
		{data: masterPhaseGraphs[3], lines: {lineWidth: phaseLineWidth}}], {resolution: dpRatio, yaxis: yBackOptions, xaxis: xBackOptions, shadowSize: 0, grid: gridOptions, colors: palette});
}

function drawMagnitudeResponse(channel, filter) {
	palette = [];
	if (channel != undefined) { // draw the response of a single filter
	
		// Order graphs so that the selected one is in front.
		channelOrder = [];
		tempPalette = fadedFilterGraphPalette.slice(0);
		for (var i = 0; i < 4; i++) {
			if (i != channel) {
				channelOrder.push(i);
				palette.push(tempPalette[i]);
			}
		}
		channelOrder.push(channel);
		palette.push(filterGraphPalette[channel]);
		palette.push(tempPalette[channel]);
		
		Flotr.draw(document.getElementById('dsp-graph-container'), [
		{data: masterFilterGraphs[channelOrder[0]], lines: {lineWidth: magLineWidth}},
		{data: masterFilterGraphs[channelOrder[1]], lines: {lineWidth: magLineWidth}},
		{data: masterFilterGraphs[channelOrder[2]], lines: {lineWidth: magLineWidth}},
		{data: masterFilterGraphs[channelOrder[3]], lines: {lineWidth: magLineWidth}},
		{data: filterGraphs[channel][filter], lines: {lineWidth: magLineWidth, fill: true}}], {resolution: dpRatio, yaxis: yOptions, y2axis: y2Options, xaxis: xOptions, shadowSize: 0, grid: gridOptions, colors: palette});
	} else {
		palette = filterGraphPalette.slice(0);
		Flotr.draw(document.getElementById('dsp-graph-container'), [
		{data: masterFilterGraphs[0], lines: {lineWidth: magLineWidth}},
		{data: masterFilterGraphs[1], lines: {lineWidth: magLineWidth}},
		{data: masterFilterGraphs[2], lines: {lineWidth: magLineWidth}},
		{data: masterFilterGraphs[3], lines: {lineWidth: magLineWidth}}], {resolution: dpRatio, yaxis: yOptions, y2axis: y2Options, xaxis: xOptions, shadowSize: 0, grid: gridOptions, colors: palette});
	}
}

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRGB(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}