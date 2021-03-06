/* convolution layer


	Weblas Functions Used

	* slokn
	* sgemm
*/
var weblas = require('weblas'),
	Tensor = weblas.pipeline.Tensor,
	type = require('type-detect');
/* Create a convolution layer
 *
 * kernels must be input in transposed form
 */
function Convolution(kernels, size, count, stride, bias, margin){
	var N, K;

	if(type(bias) === "Tensor"){
		this.bias = bias;
		console.assert(this.bias.shape[0] === 1, "Bias Tensor must have first dimension of length one.");
		K = this.bias.shape[1];
	} else {
		K = bias.length;
		this.bias = new Tensor([1, K], bias);
	}


	// transpose kernels are required
	if(type(kernels) === "Tensor"){
		console.assert(this.kernels.shape[0] === K, "Kernel Tensor first dimension must equal Bias Tensor second dimension.");
		this.kernels = kernels;
	} else {
		N = (kernels.length / K) | 0;
		console.assert(K * N === kernels.length, "Kernel Array must have length equal to a multiple of bias array length.");

		this.kernels = new Tensor([K, N], kernels);
	}

	// kernel patch size
	this.size = size;
	// kernel count
	this.count = count;

	// stride between kernel patches
	this.stride = stride;
	// margin to add
	this.margin = margin;
}

module.exports = Convolution;

Convolution.prototype.forward = function(input, M, N, channels){

	var T_in;
	// is the input a Tensor?
	if(type(input) === "Tensor"){
		// yes, use or reshape it
		if(input.shape[0] !== M || input.shape[1] !== N * channels) {
			T_in = input.reshape([M, N * channels]);
		} else {
			T_in = input;
		}
	} else {
		// no, create a Tensor (uploads data to GPU)
		T_in = new weblas.pipeline.Tensor([M, N * channels], input);
	}

	// linearize onto kernels
	var T_lin = weblas.pipeline.slokn(channels, this.size, this.stride, this.margin, T_in);


	// do the matrix multiply
	//sgemm(n, m, k, scale, bBuffer, aBuffer, scale, bias);
	var output = weblas.pipeline.sgemm(1.0, T_lin, this.kernels, 1.0, this.bias);

	// if we created the Tensor, delete it
	if(type(input) !== "Tensor"){
		T_in.delete();
	}

	return output;
}
