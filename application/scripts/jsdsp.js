// JSDSP
// 2017 Bang & Olufsen
// Tuomas Hämäläinen

// Cache Pi
var mathPI = Math.PI;

// BIQUAD FILTER CALCULATION FUNCTIONS

// Peak filter
function peak(Fs, Fc, dBBoost, Q, gain) {
	// Equivalent to the "Parametric" 2nd order filter in SigmaStudio
	w0 = 2 * mathPI * Fc / Fs;
	gainLinear = Math.pow(10, (gain / 20));
	
	A = Math.pow(10, (dBBoost / 40));
	alpha = Math.sin(w0) / (2 * Q);
	
	// Calculate initial coefficients
	a0i =   1 + alpha / A;
	a1i =  -2 * Math.cos(w0);
	a2i =   1 - alpha / A;
	b0i =  (1 + alpha * A) * gainLinear;
	b1i = -(2 * Math.cos(w0)) * gainLinear;
	b2i =  (1 - alpha * A) * gainLinear;
	
	// Loop coefficients through normalisation function
	return normaliseCoeffs(a0i, a1i, a2i, b0i, b1i, b2i)
	
}


// Butterworth lowpass
function lowPass(Fs, Fc, gain) {
	// Equivalent to the "Butterworth LP" 2nd order filter in SigmaStudio
	w0 = 2 * mathPI * Fc / Fs;
	gainLinear = Math.pow(10, (gain / 20));
	
	alpha = Math.sin(w0) / (2.0 * 1 / Math.sqrt(2));
	
	// Calculate initial coefficients
	a0i =  1 + alpha;
	a1i = -2 * Math.cos(w0);
	a2i =  1 - alpha;
	b0i = (1 - Math.cos(w0)) * gainLinear / 2;
	b1i = (1 - Math.cos(w0)) * gainLinear;
	b2i = (1 - Math.cos(w0)) * gainLinear / 2;
	
	// Loop coefficients through normalisation function
	return normaliseCoeffs(a0i, a1i, a2i, b0i, b1i, b2i)
	
}


// Butterworth highpass
function highPass(Fs, Fc, gain) {
	// Equivalent to the "Butterworth HP" 2nd order filter in SigmaStudio
	w0 = 2 * mathPI * Fc / Fs;
	gainLinear = Math.pow(10, (gain / 20));
	
	alpha = Math.sin(w0) / (2.0 * 1 / Math.sqrt(2));
	
	// Calculate initial coefficients
	a0i =   1 + alpha;
	a1i =  -2 * Math.cos(w0);
	a2i =   1 - alpha;
	b0i =  (1 + Math.cos(w0)) * gainLinear / 2;
	b1i = -(1 + Math.cos(w0)) * gainLinear;
	b2i =  (1 + Math.cos(w0)) * gainLinear / 2;
	
	// Loop coefficients through normalisation function
	return normaliseCoeffs(a0i, a1i, a2i, b0i, b1i, b2i)
	
}

// Low-shelf filter
function lowShelf(Fs, Fc, dBBoost, slope, gain) {
	// 2nd-order low-shelf filter
	w0 = 2 * mathPI * Fc / Fs;
	gainLinear = Math.pow(10, (gain / 20));
	
	A = Math.pow(10, (dBBoost / 40));
	alpha = Math.sin(w0) / 2 * Math.sqrt((A + 1/A)*(1/slope - 1) + 2);

	// Calculate initial coefficients
	a0i =          (A+1) + (A-1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha;
	a1i =    -2 * ((A-1) + (A+1) * Math.cos(w0));
	a2i =          (A+1) + (A-1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha;
	b0i =     A * ((A+1) - (A-1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha);
	b1i = 2 * A * ((A-1) - (A+1) * Math.cos(w0));
	b2i =     A * ((A+1) - (A-1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha);
	
	// Loop coefficients through normalisation function
	return normaliseCoeffs(a0i, a1i, a2i, b0i, b1i, b2i)
	
}

// High-shelf filter
function highShelf(Fs, Fc, dBBoost, slope, gain) {
	// 2nd-order high-shelf filter
	w0 = 2 * mathPI * Fc / Fs;
	gainLinear = Math.pow(10, (gain / 20));
	
	A = Math.pow(10, (dBBoost / 40));
	alpha = Math.sin(w0) / 2 * Math.sqrt((A + 1/A)*(1/slope - 1) + 2);

	// Calculate initial coefficients
	a0i =           (A+1) - (A-1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha;
	a1i =      2 * ((A-1) - (A+1) * Math.cos(w0));
	a2i =           (A+1) - (A-1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha;
	b0i =      A * ((A+1) + (A-1) * Math.cos(w0) + 2 * Math.sqrt(A) * alpha);
	b1i = -2 * A * ((A-1) + (A+1) * Math.cos(w0));
	b2i =      A * ((A+1) + (A-1) * Math.cos(w0) - 2 * Math.sqrt(A) * alpha);
	
	// Loop coefficients through normalisation function
	return normaliseCoeffs(a0i, a1i, a2i, b0i, b1i, b2i)
	
}


// Normalise coefficients so that a0 is always 1.
function normaliseCoeffs(a0i, a1i, a2i, b0i, b1i, b2i) {
	a0 = 1;
	a1 = a1i / a0i;
	a2 = a2i / a0i;
	b0 = b0i / a0i;
	b1 = b1i / a0i;
	b2 = b2i / a0i;
	
	return [a0, a1, a2, b0, b1, b2];
}