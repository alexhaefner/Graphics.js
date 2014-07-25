function Graphics() {
    //TODOs
    this.gl = null;
    this.canvas = null;
    this.dom = null;
}

// 3d things

function Texture() {
    //TODO
}

function RenderSequence(scene, glContext, name, func) {
    this.func = func.bind(this);
    this.name = name;
    var private = {};
    var that = this;
    var oldDate = null;
    var newDate = null;
    var continueAnimation = true;
    var totalElapsedTime = 0;
    var timeSinceEpoch = function(dateObject) {
        return dateObject.getMilliseconds() + dateObject.getSeconds() * 1000 + dateObject.getMinutes() * 60 * 1000;
    }

    this.ready = function() {
        if (private.onReady) {
            private.onReady({timeDelta: 0, totalElapsedTime: 0, context: glContext});
        }
    }

    this.start = function() {
        continueAnimation = true;
        if (private.onStart) {
            private.onStart({context: glContext});
        }
        window.requestAnimationFrame(this.funcWrapper);
    }
    this.pause = function() {
        if (private.onPause) {
            private.onPause();
        }
        continueAnimation = false;
    }
    this.onPause = function(func) {
        private.onPause = func;
    }
    this.onStop = function(func) {
        private.onStop = func;
    }
    this.onStart = function(func) {
        private.onStart = func;
    }
    this.onReady = function(func) {
        private.onReady = func;
    }
    this.resume = function() {
        continueAnimation = true;
        window.requestAnimationFrame(this.funcWrapper);
    }
    this.stop = function() {
        oldDate = null;
        if (private.onStop) {
            private.onStop();
        }
        continueAnimation = false;
    }
    this.funcWrapper  = function() {
        if (continueAnimation) {
            newDate = new Date();
            var delta = oldDate == null ? 0 : timeSinceEpoch(newDate) - timeSinceEpoch(oldDate);
            totalElapsedTime += delta;
            that.func({timeDelta: delta, totalElapsedTime: totalElapsedTime, context: glContext});
            oldDate = newDate;
            window.requestAnimationFrame(that.funcWrapper);
        }
    }
}

function Scene (glContext) {
    // Private
    var that = this;
    var private = {};
    private.synchronousTexturesLoaded = false;
    private.synchronousShadersLoaded = false;
    private.textureLoadingStatuses = {};
    private.shaderLoadingStatuses = {}
    private.renderWhenReady = false;
    private.renderLoop = null;
    private.resourceLoadingStatus = {done: 'done', loading: 'loading', failed:'failed'};
    private.notifyTextureReady = function(name) {
        private.textureLoadingStatuses[name] = private.resourceLoadingStatus.done;
        private.notifyIfReadyAndTryToRender();
    }
    private.notifyTextureWillLoad = function(name) {
        private.textureLoadingStatuses[name] = private.resourceLoadingStatus.loading;
    }
    private.notifyShaderReady = function(name) {
        private.shaderLoadingStatuses[name] = private.resourceLoadingStatus.done;
        private.notifyIfReadyAndTryToRender();
    }
    private.notifyShaderWillLoad = function(name) {
        private.shaderLoadingStatuses[name] = private.resourceLoadingStatus.loading;
    }

    private.notifyIfReadyAndTryToRender = function() {
        if (that.readyToRender()) {
            private.renderLoop.ready();
            if (private.renderWhenReady) {
                private.renderWhenReady = false;
                private.renderLoop.start();
            }
        }
    }

    private.createAndCompileShaderWithSource = function(source, type) {
        var shader = glContext.createShader(type);
        glContext.shaderSource(shader, source);
        glContext.compileShader(shader);
        return shader;
    }

    private.createProgramAndAttachShaders = function(vertexShader, fragmentShader) {
        var program = glContext.createProgram();
        glContext.attachShader(program, vertexShader);
        glContext.attachShader(program, fragmentShader);
        glContext.linkProgram(program);

        if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
            throw glContext.getProgramInfoLog(program);
        }
        return program;
    }

    private.constructUniformsForProgram = function(program, uniforms) {
        var result = {};
        for (var index in uniforms) {
            var uniformDef = uniforms[index];
            for (var name in uniformDef) {
                result[name] = {loc: glContext.getUniformLocation(program, name), uniformType: uniformDef[name]};
            }
        }
        return result;
    }

    private.constructAttributesForProgram = function(program, attributes) {
        var result = {};
        for (var index in attributes) {
            var name = attributes[index];
            result[name] = glContext.getAttribLocation(program, name);
        }
        return result;
    }

    /* Asynchronously loads a shader pair (vertex, fragment) and returns them to the scene object.
    This method will create gl texture objects, and place them in the scene's `shaders` dictionary.
    */
    private.loadShaderPairWithNameFromURL = function(name, url, uniforms, attribs) {
        private.notifyShaderWillLoad(name);
        var frame = document.createElement("iframe");
        var returnValue = {};
        frame.style.display = "none";

        frame.onload = function(e) {
            returnValue.fragment = frame.contentWindow.fragment;
            returnValue.vertex = frame.contentWindow.vertex;
            var fragmentShader = private.createAndCompileShaderWithSource(returnValue.fragment, glContext.FRAGMENT_SHADER);
            var vertexShader = private.createAndCompileShaderWithSource(returnValue.vertex, glContext.VERTEX_SHADER);
            var program = private.createProgramAndAttachShaders(vertexShader, fragmentShader);
            that.shaders[name] = {
                vertex: vertexShader, 
                fragment: fragmentShader, 
                program: program, 
                uniforms: private.constructUniformsForProgram(program, uniforms),
                attributes: private.constructAttributesForProgram(program, attribs)
            };
            private.notifyShaderReady(name);
            document.body.removeChild(frame);
            frame = null;
        };
        frame.onerror = function(e) {
            console.log(e);
        }

        frame.src = url;
        document.body.appendChild(frame);
        return returnValue;
    }

    /* Asynchronously loads an image and converts it to a texture
    */
    private.loadImageWithNameFromURL = function(name, url) {
        private.notifyTextureWillLoad(name);
        var returnValue = {};
        var img = new Image();
        img.onload = function() {
            returnValue.image = img;
            var gl = glContext;
            var texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D, null);
            that.textures[name] = texture;
            private.notifyTextureReady(name);
        }
        img.onerror = function(e) {
            console.log(error);
        }
        img.src = url;
        return returnValue;
    }

    // Public
    this.glContext = glContext;
    this.textures = {};
    this.shaders = {};
    this.shaderSource = {};
    this.syncShaderLoader = {};
    this.asyncShaderLoaders = {};
    this.syncTextureURLS = {};
    this.asyncTextureURLS = {};
    this.images = {};
    this.currentShaderName = null;
    this.addSyncShaderLoader = function(name, url, uniforms, attribs) {
        this.shaderSource[name] = private.loadShaderPairWithNameFromURL(name, url, uniforms, attribs);
    }

    this.addSyncTextureLoader = function(name, url) {
        this.images[name] = private.loadImageWithNameFromURL(name, url);
    }

    this.readyToRender = function() {
        for (var key in private.textureLoadingStatuses) {
            if (private.textureLoadingStatuses[key] != private.resourceLoadingStatus.done) {
                return false;
            }
        }
        for (var key in private.shaderLoadingStatuses) {
            if (private.shaderLoadingStatuses[key] != private.resourceLoadingStatus.done) {
                return false;
            }
        }
        return true;
    }

    this.useShader = function(name) {
        if (this.currentShaderName != name) {
            glContext.useProgram(this.shaders[name].program);
            this.currentShaderName = name;
            this.currentShader = this.shaders[name];
        }
    }

    this.setRenderLoop = function(func) {
        private.renderLoop = new RenderSequence(this, glContext, name, func);
    }

    this.start = function() {
        if (this.readyToRender()) {
            private.renderLoop.start();
        } else {
            private.renderWhenReady = true;
        }
    }
    this.onStart = function(func) {
        if (private.renderLoop) {
            private.renderLoop.onStart(func);
        }
    }
    this.onStop = function(func) {
        if (private.renderLoop) {
            private.renderLoop.onStop(func);
        }
    }
    this.onPause = function(func) {
        if (private.renderLoop) {
            private.renderLoop.onPause(func);
        }
    }
    this.onReady = function(func) {
        if (private.renderLoop) {
            private.renderLoop.onReady(func);
        }
    }

    // Shader helpers - Note: These always apply to the currently set shader
    this.setValueForUniform = function(name, value) {
        var uniform = this.shaders[this.currentShaderName].uniforms[name];
        if (uniform.uniformType == 'mat4') {
            glContext.uniformMatrix4fv(uniform.loc, false, value);
        } else if (uniform.uniformType == 'sampler2D') {
            glContext.uniform1i(uniform.loc, value)
        }
    }

    this.setActiveTexture = function(name) {
        glContext.activeTexture(glContext.TEXTURE0);
        glContext.bindTexture(glContext.TEXTURE_2D, this.textures[name]);
    }

    this.setArrayBufferWithMesh = function(name, mesh) {
        var gl = glContext;
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
        var vertexAttr = this.currentShader.attributes[name];
        gl.enableVertexAttribArray(vertexAttr);
        gl.vertexAttribPointer(vertexAttr, mesh.dimensions, gl.FLOAT, false, 0, 0);
    }

    this.drawMesh = function(mesh) {
        // finally, drawing
        mesh.drawMesh(function(start, end) {
            glContext.drawArrays(glContext.TRIANGLE_STRIP, start, end);
        });
    }
}

function Graphics3D() {
    // Private
    this.scenes = {};
    this.sceneRenderSequences = {};
    var internalErrorHandler = null;
    var that = this;
    var bufferHeight = function() {
        return that.canvas.height;
    }
    var bufferWidth = function() {
        return that.canvas.width;
    }
    // Public
    this.errors = {
        WEBGL_UNSUPPORTED: 'WEBGL_UNSUPPORTED',
    }
    this.setupGL = function(canvas) {
        this.canvas = canvas;
        this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");
        if (this.gl === null) {
            internalErrorHandler(this.errors.WEBGL_UNSUPPORTED);
            //this = null;
            return;
        }
        this.resizeCanvas({width: canvas.width, height:canvas.height});
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
    }
    this.resizeCanvas = function(size) {
        var pixelRatio = window.devicePixelRatio || 1.0;
        this.canvas.width = size.width * pixelRatio;
        this.canvas.height = size.height * pixelRatio;
        this.canvas.style.width = size.width + "px";
        this.canvas.style.height = size.height + "px";
        this.gl.viewport(0, 0, size.width * pixelRatio, size.height * pixelRatio);
    }
    this.didError = function(errorHandler) {
        internalErrorHandler = errorHandler;
    }

    // Scenes

    this.registerScenesWithCreationCallbacks = function(dict) {
        this.sceneCreationMethods = dict;
    }
    this.setupScene = function(name) {
        this.scenes[name] = this.sceneCreationMethods[name](this.gl);
    }
    this.startScene = function(name) {
        this.scenes[name].start();
    }
}
