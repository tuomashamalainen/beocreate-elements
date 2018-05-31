var sampleRate = 48000;
var maxFilters = 6;
var filters = []; // stores coefficients
var plots = []; // stores the plot data points
var phasePlots = [];
var masterPlot = [];
var masterPhasePlot = [];
var plotLength = 512;

var invertSignal = false;
var lastFilter = null;


window.addEventListener('load', function() {
	new FastClick(document.body);
}, false);


function clearPlots() {
	filters = [];
	lastFilter = null;
	masterPlot = [];
	plots = [];
	drawPlot(0);
}

function toggleInvert() {
	if (invertSignal) {
		invertSignal = false;
		$("#inverter").removeClass("inverted");
	} else {
		invertSignal = true;
		$("#inverter").addClass("inverted");
	}
	if (lastFilter != null) {
		for (var i = 0; i < filters.length; i++) {
			if (filters[i]) {
				calculatePlot(i, sampleRate);
			}
		}
		drawPlot(lastFilter);
	}
}

var dpRatio = window.devicePixelRatio;


function filter(index, type, center, boost, Q) {
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
	
	filters[index] = coeffs;
	//console.log(coeffs);
	
	calculatePlot(index, sampleRate);
	drawPlot(index);
	lastFilter = index;
}

function calculatePlot(index, Fs) {
	coeffs = filters[index];
	
	a0 = coeffs[0];
	a1 = coeffs[1];
	a2 = coeffs[2];
	b0 = coeffs[3];
	b1 = coeffs[4];
	b2 = coeffs[5];
	
	if (invertSignal) {
		//b0 = b0*-1;
		//b1 = b1*-1;
		//b2 = b2*-1;
	}
	
	//console.log(a0,a1,a2,b0,b1,b2);
	
	plots[index] = [];
	phasePlots[index] = [];
	for (var i = 0; i < plotLength; i++) {
		freq = logScale(i / plotLength, 0.0001, 0.5);
		res0 = math.add(0, math.multiply(b0, math.exp(math.complex(0,-0 * freq * 2 * math.pi))));
		res0 = math.add(res0, math.multiply(b1, math.exp(math.complex(0,-1 * freq * 2 * math.pi))));
		res0 = math.add(res0, math.multiply(b2, math.exp(math.complex(0,-2 * freq * 2 * math.pi))));
		resP = math.add(0, math.multiply(a0, math.exp(math.complex(0,-0 * freq * 2 * math.pi))));
		resP = math.add(resP, math.multiply(a1, math.exp(math.complex(0,-1 * freq * 2 * math.pi))));
		resP = math.add(resP, math.multiply(a2, math.exp(math.complex(0,-2 * freq * 2 * math.pi))));
		response = math.divide(res0, resP);
		
		var tempMag = math.abs(response);
		if (tempMag == 0)
			tempMag = -300;
		else
			tempMag = 20 * Math.log10(tempMag);
		
		plots[index].push([freq * Fs, tempMag]);
		
		// Phase
		phasePlots[index].push([freq * Fs, math.atan2(response.im, response.re)]);
	}
	/*for (var i = 0; i < plotLength; i++) {
		//w = Math.exp(Math.log(1 / 0.001) * i / (plotLength - 1)) * 0.001 * Math.PI;
		w = i / (plotLength - 1) * Math.PI;
		//w = logScale(i / plotLength, 0.0001, 0.5);
		
		fi = Math.pow(Math.sin(w/2), 2);
		y = Math.log(Math.pow(b0+b1+b2, 2) - 4 * (b0*b1 + 4*b0*b2 + b1*b2) * fi + 16*b0*b2*fi*fi) - Math.log(Math.pow(1+a1+a2, 2) - 4 * (a1 + 4*a2 + a1*a2)*fi + 16*a2*fi*fi);
		y = y * 10 / Math.LN10;
		if (isNaN(y)) y = -200;
		
		plots[index].push([i / (plotLength - 1) * Fs / 2, y]);
		//plots[index].push([i / (plotLength - 1) / 2, y]);
		//console.log(w * Fs / 2);
	}*/
	//console.log(plots[index]);
}

function logScale(value, min, max) {
	return Math.pow(2, Math.log(max / min) / Math.LN2 * value) * min;
}

var xOptions = {scaling: "logarithmic", base: 10, ticks: [[100, "100"], [1000, "1k"], [10000, "10k"]], minorTicks: [20,30,40,50,60,70,80,90,200,300,400,500,600,700,800,900,2000,3000,4000,5000,6000,7000,8000,9000], min: 10, max: 20000, showLabels: false, margin: false};
var yOptions = {showLabels: false, max: 15, min: -15, margin: false, ticks: [[10, "+10"], [5, ""], [0, "0"], [-5, ""], [-10, "-10"]]};
var y2Options = {showLabels: false, max: Math.PI, min: -Math.PI, margin: false, noTicks: 0};
var gridOptions = {tickColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", outlineWidth: 0, labelMargin: 0};


function drawPlot(index) {
	/*if (index != undefined) { // draw the response of a single filter
		Flotr.draw(document.getElementById('graph-container'), [plots[index]], {resolution: dpRatio, yaxis: yOptions, grid: {color: "rgba(255,255,255,0.3)"}, xaxis: xOptions, shadowSize: 0, lines: {fill: true, fillOpacity: 0.4, fillColor: "#FFFFFF"}});
	} else { // draw the combined response of all filters*/
		masterPlot = [];
		masterPhasePlot = [];
		for (var i = 0; i < plotLength; i++) {
			plotPoint = 0;
			plotPhasePoint = 0;
			plotFreq = null;
			for (var a = 0; a < maxFilters; a++) {
				if (plots[a]) {
					plotFreq = plots[a][i][0];
					plotPoint += plots[a][i][1];
					plotPhasePoint += phasePlots[a][i][1];
				}
			}
			masterPlot.push([plotFreq, plotPoint]);
			
			if (invertSignal) {
				plotPhasePoint+= Math.PI;
			}
			if (plotPhasePoint > Math.PI) plotPhasePoint-= 2*Math.PI;
			if (plotPhasePoint < -Math.PI) plotPhasePoint+= 2*Math.PI;
			
			masterPhasePlot.push([plotFreq, plotPhasePoint]);
			
			// Cut the graph so there aren't vertical lines going across the graph
			if (i) {
				if (Math.abs(masterPhasePlot[i-1][1] - masterPhasePlot[i][1]) > 0.5 && masterPhasePlot[i-1][1] != null) {
					masterPhasePlot[i][1] = null;
				}
			}
			
			//console.log(plotPhasePoint);
			//masterPlot.push([i / (plotLength - 1) * sampleRate / 2, plotPoint]);
			//masterPlot.push([i / (plotLength - 1) / 2, plotPoint]);
		}
		Flotr.draw(document.getElementById('graph-container'), [
		{data: plots[index], lines: {lineWidth: 1}},
		{data: masterPlot, lines: {lineWidth: 1}},
		{data: masterPhasePlot, yaxis: 2, lines: {lineWidth: 1}}], {resolution: dpRatio, yaxis: yOptions, y2axis: y2Options, xaxis: xOptions, shadowSize: 0, grid: gridOptions, colors: ["#0e77f4", "#fff", "rgba(255, 60, 101, 0.8)"]});
	//}
}

// ticks: [100, 1000, 10000], minorTicks: [10,20,30,40,50,60,70,80,90,200,300,400,500,600,700,800,900,2000,3000,4000,5000,6000,7000,8000,9000,11000]
// {scaling: "logarithmic", base: 10, noTicks: 5, min: 10, max: 20000}, shadowSize: 0 }

