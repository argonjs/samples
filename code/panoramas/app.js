/// <reference types="@argonjs/argon"/>
/// <reference types="three"/>
// set up Argon
var app = Argon.init('#my-pano-argon-app');
// set up THREE.  Create a scene, a perspective camera and an object
// for the user's location
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera();
var stage = new THREE.Object3D;
scene.add(camera);
scene.add(stage);
// We use the standard WebGLRenderer when we only need WebGL-based content
var renderer = new THREE.WebGLRenderer({
    alpha: true,
    logarithmicDepthBuffer: true,
    antialias: Argon.suggestedWebGLContextAntialiasAttribute
});
// account for the pixel density of the device
renderer.setPixelRatio(window.devicePixelRatio);
app.view.setLayers([{ source: renderer.domElement }]);
// add some ambient so things aren't so harshly illuminated
var ambientlight = new THREE.AmbientLight(0x404040); // soft white ambient light 
scene.add(ambientlight);
// set our desired reality 
app.reality.request(Argon.resolveURL('../panorama-reality/index.html'));
var panoRealitySession;
// list our panoramas
var panoramas = [{
        name: 'Georgia Aquarium',
        url: Argon.resolveURL('images/aqui.jpg'),
        longitude: -84.3951,
        latitude: 33.7634,
        height: 206
    },
    {
        name: 'Centennial Park',
        url: Argon.resolveURL('images/cent.jpg'),
        longitude: -84.3931,
        latitude: 33.7608,
        height: 309
    },
    {
        name: 'High Museum',
        url: Argon.resolveURL('images/high.jpg'),
        longitude: -84.38584,
        latitude: 33.79035,
        height: 289
    },
    {
        name: 'Piedmont Park',
        url: Argon.resolveURL('images/pied.jpg'),
        longitude: -84.37427,
        latitude: 33.78577,
        height: 271
    }
];
var currentPanorama;
// get the menu element
var menu = document.getElementById('menu');
menu.style.zIndex = '2';
// add buttons to the menu for each panorama
panoramas.forEach(function (p) {
    var button = document.createElement('button');
    button.textContent = p.name;
    menu.appendChild(button);
    // when a button is tapped, have the reality fade in the corresponding panorama
    button.addEventListener('click', function () {
        if (panoRealitySession) {
            panoRealitySession.request('edu.gatech.ael.panorama.showPanorama', {
                url: p.url,
                transition: {
                    easing: 'Quadratic.InOut',
                    duration: 1000
                }
            }).then(function () {
                currentPanorama = p;
            });
        }
    });
});
app.focusEvent.on(function () {
    document.getElementById('menu').style.display = 'block';
});
app.blurEvent.on(function () {
    document.getElementById('menu').style.display = 'none';
});
// start listening for connections to a reality
app.reality.connectEvent.on(function (session) {
    // check if the connected supports our panorama protocol
    if (session.supportsProtocol('edu.gatech.ael.panorama')) {
        // save a reference to this session so our buttons can send messages
        panoRealitySession = session;
        // show the menu
        document.getElementById('menu').style.visibility = 'visible';
        // load our panoramas
        panoramas.forEach(function (p) {
            panoRealitySession.request('edu.gatech.ael.panorama.loadPanorama', p);
        });
        // fade in the first panorama slowly
        panoRealitySession.request('edu.gatech.ael.panorama.showPanorama', {
            url: panoramas[0].url,
            transition: {
                easing: 'Quadratic.InOut',
                duration: 2000
            }
        }).then(function () {
            currentPanorama = panoramas[0];
        });
        // hide the menu when the reality session closes
        session.closeEvent.on(function () {
            document.getElementById('menu').style.visibility = 'collapse';
            panoRealitySession = undefined;
            currentPanorama = undefined;
        });
    }
});
var myMysteriousLabel = new THREE.Object3D();
// create a label  
var loader = new THREE.FontLoader();
loader.load('../resources/fonts/helvetiker_regular.typeface.json', function (font) {
    var textOptions = {
        font: font,
        size: 15,
        height: 10,
        curveSegments: 10,
        bevelThickness: 1,
        bevelSize: 1,
        bevelEnabled: true
    };
    var textMaterial = new THREE.MeshStandardMaterial({
        color: 0x5588ff
    });
    function createDirectionLabel(text, position, rotation) {
        var textGeometry = new THREE.TextGeometry(text, textOptions);
        textGeometry.center();
        var textMesh = new THREE.Mesh(textGeometry, textMaterial);
        if (position.x)
            textMesh.position.x = position.x;
        if (position.y)
            textMesh.position.y = position.y;
        if (position.z)
            textMesh.position.z = position.z;
        if (rotation.x)
            textMesh.rotation.x = rotation.x;
        if (rotation.y)
            textMesh.rotation.y = rotation.y;
        if (rotation.z)
            textMesh.rotation.z = rotation.z;
        return textMesh;
    }
    var textMesh = createDirectionLabel("Pears!?", { x: -300 }, { y: Math.PI / 2 });
    myMysteriousLabel.add(textMesh);
});
// the updateEvent is called each time the 3D world should be
// rendered, before the renderEvent.  The state of your application
// should be updated here.
app.updateEvent.on(function () {
    // get the pose of the "stage" to anchor our content. 
    // The "stage" defines an East-Up-South coordinate system 
    // (assuming geolocation is available).
    var stagePose = app.getEntityPose(app.stage);
    // set the pose of our THREE stage object
    if (stagePose.poseStatus & Argon.PoseStatus.KNOWN) {
        stage.position.copy(stagePose.position);
        stage.quaternion.copy(stagePose.orientation);
    }
    // show a 3d label when displaying a particular panorama
    if (currentPanorama && currentPanorama.name === 'High Museum') {
        stage.add(myMysteriousLabel);
    }
    else {
        stage.remove(myMysteriousLabel);
    }
});
// renderEvent is fired whenever argon wants the app to update its display
app.renderEvent.on(function () {
    // set the renderer to know the current size of the viewport.
    // This is the full size of the viewport, which would include
    // both views if we are in stereo viewing mode
    var view = app.view;
    renderer.setSize(view.renderWidth, view.renderHeight, false);
    renderer.setPixelRatio(app.suggestedPixelRatio);
    // there is 1 subview in monocular mode, 2 in stereo mode    
    for (var _i = 0, _a = app.view.subviews; _i < _a.length; _i++) {
        var subview = _a[_i];
        // set the position and orientation of the camera for 
        // this subview
        camera.position.copy(subview.pose.position);
        camera.quaternion.copy(subview.pose.orientation);
        // the underlying system provide a full projection matrix
        // for the camera. 
        camera.projectionMatrix.fromArray(subview.frustum.projectionMatrix);
        // set the viewport for this view
        var _b = subview.renderViewport, x = _b.x, y = _b.y, width = _b.width, height = _b.height;
        renderer.setViewport(x, y, width, height);
        // set the webGL rendering parameters and render this view
        renderer.setScissor(x, y, width, height);
        renderer.setScissorTest(true);
        renderer.render(scene, camera);
    }
});
