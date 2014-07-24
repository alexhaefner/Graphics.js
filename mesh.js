function Mesh(fullCoords, N) {
	this.fullCoords = fullCoords;
	this.n = N;
	this.dimensions = 2;

	var private = {};
	var dimensionality = this.dimensions; // 2d right meow
	var numberOfPointsInARow = (2 + (2* N.x)); // points are [x,y] pairs
	var numberOfRows = N.y;
	var totalPoints = numberOfPointsInARow * numberOfRows * dimensionality;
	this.data = new Float32Array(totalPoints);
	var xStart = fullCoords[0];
	var yStart = fullCoords[1];
	var xEnd = fullCoords[2];
	var yEnd = fullCoords[3];
	var curX = xStart;
	var curY = yStart;
	var xStep = (xEnd - xStart) / N.x;
	var yStep = (yEnd - yStart) / N.y;
	var currentVerticeIndex = 0;
	/*
	Layout for vertice indexes:
		0 ---- 2 ---- 4
        |    / |    / |
        |   /  |   /  |
        |  /   |  /   |
        | /    | /    |
        1 ---- 3 ---- 5
	*/
	var currentArrayIndex = 0;
	for (index = 0; index < (totalPoints / dimensionality); index++) {
		var willSwitchToNewRowOnNextIteration = ((currentArrayIndex + 1) % numberOfPointsInARow) == 0;
		var properIndex = (currentArrayIndex * dimensionality);
		this.data[properIndex] = curX;
		this.data[properIndex + 1] = curY;
		if (currentVerticeIndex == 0) {
			curY += yStep;
			currentVerticeIndex = 1;
		} else if (currentVerticeIndex == 1) {
			// We're at the (vertical) bottom of a row
			if (willSwitchToNewRowOnNextIteration) {
				curX = xStart;
			} else {
				curY -= yStep;
				curX += xStep;
			}
			currentVerticeIndex = 0;
		}
		currentArrayIndex++;
	}

	this.drawMesh = function(renderStep) {
		for (var index = 0; index < this.n.y; index++) {
			var startIndexForGLArray = index * numberOfPointsInARow;
			var endIndexForGLArray = numberOfPointsInARow;
			renderStep(startIndexForGLArray, endIndexForGLArray);
		}
	}

	private.createIndex = function(x, y) {
		return {x: x / N.x, y: y / N.y};
	}

	this.forEach = function(func) {
		var currentArrayIndex = 0;
		var xIndex = 0;
		var yIndex = 0;
		for (var idx = 0; idx < (totalPoints / dimensionality); idx++) {
			var willSwitchToNewRowOnNextIteration = ((currentArrayIndex + 1) % numberOfPointsInARow) == 0;
			var properIndex = (currentArrayIndex * dimensionality);
			var index = private.createIndex(xIndex, yIndex);
			var xy = func(index);
			this.data[properIndex] = xy[0];
			this.data[properIndex + 1] = xy[1];
			if (currentVerticeIndex == 0) {
				yIndex += 1;
			} else if (currentVerticeIndex == 1) {
				// We're at the (vertical) bottom of a row
				if (willSwitchToNewRowOnNextIteration) {
					xIndex = 0;
				} else {
					yIndex -= 1;
					xIndex += 1;
				}
			}
			currentVerticeIndex = (currentVerticeIndex == 0) ? 1 : 0;
			currentArrayIndex++;
		}

	}
}