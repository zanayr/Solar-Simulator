var sim,
    star,
    scene;
(function () {
    'use strict';
    var content = grab('#canvas'),
        // scene,
        camera,
        renderer;
    
    function Center () {
        Object.defineProperties(this, {
            anchor: {
                value: new THREE.Object3D()
            }
        });
    }
    function Geometry (geometry, color) {
        Object.defineProperties(this, {
            color: {
                set: function (value) {
                    this.material.color.set( new THREE.Color(value).getHex());
                }
            },
            geometry: {
                value: geometry
            },
            material: {
                value: new THREE.MeshBasicMaterial({color: new THREE.Color(color).getHex(), wireframe: true})
            },
            mesh: {
                value: new THREE.Mesh(this.geometry, this.material)
            }
        });
    }
    function Star (radius) {
        Object.defineProperties(this, {
            center: {
                value: new Center()
            },
            geometry: {
                value: new Geometry(new THREE.SphereGeometry(radius, 13, 13), 0xffffff)
            }
        });
        scene.add(this.center.anchor);
        this.center.anchor.add(this.geometry.mesh);
    }


    function update (t) {
        camera.position.x = 1500 * Math.cos(t * 0.0001 * -1);
        camera.position.y = 250 * Math.cos(t * 0.00001 * -1);
        camera.position.z = 1500 * Math.sin(t * 0.0001 * -1);
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }
    function loop() {
        'use strict';
        requestAnimationFrame(loop);
        update(Date.now() * 0.0025);
        renderer.render(scene, camera);
    }


    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, content.width / content.height, 1, 20000);
    
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(content.width, content.height);
    renderer.setClearColor(0x040d0c, 1);
    content.append(renderer.domElement);
    star = new Star(100);
    camera.position.set(-1000, 0, 0);
    loop();
}());