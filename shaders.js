window.onload = function() {
	var shaders = document.getElementsByTagName("script");
	for (var index in shaders) {
		var shader = shaders[index];
		if (shader.type == "x-shader/x-fragment") {
			fragment = shader.innerText;
		} else if (shader.type == "x-shader/x-vertex") {
			vertex = shader.innerText;
		}
	}
}