function Matrix(num) {
	this.num = num;
	if (num == 3) {
		this.array = new Float32Array([
			1, 0, 0,
			0, 1, 0,
			0, 0, 1,]);
	} else if (num == 4) {
		this.array = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
			]);
	}
}

function MatrixMakeOrtho(left, top, right, bottom, near, far) {
	var matrix = new Matrix(4);
	var rightMinLeft = right - left;
	var farMinNear = far - near;
	var topMinBottom = top - bottom;
	matrix.array[0] = 2 / rightMinLeft;
	matrix.array[5] = 2 / topMinBottom;
	matrix.array[10] = -2 / farMinNear;
	matrix.array[12] = - ((right + left) / rightMinLeft);
	matrix.array[13] = - ((top + bottom) / topMinBottom);
	matrix.array[14] = (far + near) / farMinNear;
	return matrix;
}

function MatrixMakePerspective(degrees, wDivH, near, far) {
	var Matrix = new Matrix(4);

}