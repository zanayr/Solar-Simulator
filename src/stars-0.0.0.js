/*  To Do List
-   Star's orbits, major and minor axis
-   Colors are the same
*/

var _system,
    scene;
// (function () {
//     var canvas = grab('0xcanvas'),
//         geometery = new THREE.SphereGeometry(20, 10, 10);
//         material = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true});
//         mesh = new THREE.Mesh(geometery, material);
//     scene = new THREE.Scene();
//     camera = new THREE.PerspectiveCamera(35, canvas.width / canvas.height, 1, 20000);
//     camera.position.set(-1000, 0, 0);
//     camera.lookAt(scene.position);
//     renderer = new THREE.WebGLRenderer();
//     renderer.setSize(canvas.width, canvas.height);
//     renderer.setClearColor(0x040d0c, 1);
//     canvas.append(renderer.domElement);
//     mesh.position.set(0, 0, 0);
//     scene.add(mesh);
//     renderer.render(scene, camera);
// }());


(function () {
    var canvas,
        renderer,
        STAR_CLASS = ['M', 'K', 'G', 'F', 'A', 'D'],
        STAR_COLOR = [0xfd113c, 0xee0000, 0xf03412, 0xf04912, 0xe8601d, 0xf06b12, 0xfe9013, 0xffa500, 0xf3a214, 0xf3c220, 0xfade17, 0xf5d04c, 0xf5e54c, 0xf8ec81, 0xfff5c3, 0xfbf3b1, 0xfdfdd9, 0xffffff, 0xedeeff, 0xd4d6ff];
        // STAR_COLOR = ['#fd113c', '#ee0000', '#f03412', '#f04912', '#e8601d', '#f06b12', '#fe9013', '#ffa500', '#f3a214', '#f3c220', '#fade17', '#f5d04c', '#f5e54c', '#f8ec81', '#fff5c3', '#fbf3b1', '#fdfdd9', '#ffffff', '#edeeff',  '#d4d6ff'];
    
    //  AUXILLARY FUNCTIONS  //
    //  Parse Probability Table  //
    function parse (p, s) {
        var a = Math.round(100 * (parseInt(s, 16) / 15)),
            i;
        for (i = 0; i < p.length; i++)
            if (a <= p[i])
                return i;
        return 0;
    }
    //  Get Seed //
    function seed () {
        return ('xxxxxxxxxxxxxxxxxxxyxxxxxxxxxxxxxxxx').replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    //  Get Unique ID  //
    function uid () {
        return ('xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }


    //  SYSTEM OBJECTS  //
    function System (seed) {
        Object.defineProperties(this, {
            handle: {
                value: new THREE.Object3D()
            },
            age: {
                value: Math.round(((10 * (parseInt(seed[0], 16) / 15)) + 2 * parseInt(seed[1] + seed[2], 16) / 255) * 100) / 100
            },
            binary: {
                value: parseInt(seed[3], 16) >= 10
            },
            iron: {
                value: Math.round(30 * (parseInt(seed[4] + seed[5], 16) / 255)) / 100
            },
            name: {
                value: seed[6] + seed[7]
            },
            seed: {
                value: seed
            }
        });
        this.handle.position.set(0, 0, 0);
        scene.add(this.handle);
    }
    System.prototype.describe = function () {
        console.log(this.name + '\n', 'age: ' + this.age + '\n', 'binary: ' + this.binary + '\n', 'iron: ' + this.iron + '\n', 'name: ' + this.name + '\n');
        console.log(this.name + 'A\n', 'class: ' + this.A.class + '\n', 'radius: ' + this.A.radius + '\n', 'color: ' + this.A.color + '\n', 'mass: ' + this.A.mass + '\n', 'density: ', + this.A.density + '\n');
        if (this.B)
            console.log(this.name + 'B\n', 'class: ' + this.B.class + '\n', 'radius: ' + this.B.radius + '\n', 'color: ' + this.B.color + '\n', 'mass: ' + this.B.mass + '\n', 'density: ', + this.B.density + '\n');
        return this;
    };

    function Sphere (r, c) {
        var u = Math.round(r / 9) + 9;
        this.radius = r;
        this.color = c;
        this.geometry = new THREE.SphereGeometry(r, u, u);
        this.material = new THREE.MeshBasicMaterial({color: c, wireframe: true});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
    }

    function getStarValues(cls) {
        var exhausted = _system.age >= cls < 3 ? 14 - cls : 14 - 2 * (cls - 1),
            color,
            radius,
            volume;
        switch (cls) {
            case 1:
                color = (parseInt(_system.seed[8], 16) % 4) + 4;
                radius = Math.round(20 * (parseInt(_system.seed[9], 16) / 15)) + 100;
                break;
            case 2:
                color = (parseInt(_system.seed[8], 16) % 4) + 8;
                radius = Math.round(20 * (parseInt(_system.seed[9], 16) / 15)) + 120;
                break;
            case 3:
                color = (parseInt(_system.seed[8], 16) % 4) + 12
                radius = Math.round(20 * (parseInt(_system.seed[9], 16) / 15)) + 140;
                break;
            case 4:
                color = (parseInt(_system.seed[8], 16) % 4) + 16;
                radius = Math.round(20 * (parseInt(_system.seed[9], 16) / 15)) + 160;
                break;
            default:
                color = parseInt(_system.seed[8], 16) % 4;
                radius = Math.round(20 * (parseInt(_system.seed[9], 16) / 15)) + 50;
                break;
        }
        volume = Math.round(133 * Math.PI * Math.pow(radius, 3)) / 100;
        mass = Math.round(141 * (volume / 10000)) / 100;
        if (exhausted) {
            switch (cls) {
                case 1:
                    color = parseInt(_system.seed[8], 16) % 4;
                    radius = Math.round(20 * (parseInt(_system.seed[9], 16) / 15)) + 140;
                    mass -= 100;
                    break;
                case 2:
                    color = parseInt(_system.seed[8], 16) % 4;
                    radius = Math.round(20 * (parseInt(_system.seed[9], 16) / 15)) + 160;
                    mass -= 100;
                    break;
                case 3:
                case 4:
                    color = (parseInt(_system.seed[8], 16) % 4) + 16;
                    radius = Math.round(6 * (parseInt(_system.seed[9], 16) / 15)) + 9;
                    mass -= 300;
                    break;
                default:
                    break;
            }
            volume = Math.round(133 * Math.PI * Math.pow(radius, 3)) / 100;
        }
        return {
            class: cls,
            color: color,
            mass: mass,
            radius: radius,
            volume: volume,
        }
    }
    function Star (prob, seed) {
        Object.defineProperties(this, {
            age: {
                value: _system.age
            },
            color: {
                get: function () {
                    return STAR_COLOR[this.values.color];
                }
            },
            class: {
                get: function () {
                    return STAR_CLASS[this.values.class];
                }
            },
            density: {
                get: function () {
                    return Math.round(this.values.mass / this.values.volume * 1000000) / 100;
                }
            },
            handle: {
                value: new THREE.Object3D()
            },
            id: {
                value: uid()
            },
            mass: {
                get: function () {
                    return this.values.mass;
                }
            },
            radius: {
                get: function () {
                    return this.values.radius;
                }
            },
            values: {
                value: Object.assign({x: 0, y: 0}, getStarValues(parse(prob, seed)))
            },
            x: {
                get: function () {
                    return this.values.x;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.values.x = value;
                    return value;
                }
            }
        });
        Object.defineProperty(this, 'object', {
            value: new Sphere(this.radius, this.color)
        });
        this.handle.add(this.object.mesh);
    }


    function stars () {
        var alpha = new Star ([53, 73, 87, 97, 100], _system.seed[7]),
            beta,
            d,
            a;
        _system.A = alpha;
        if (_system.binary) {
            beta = new Star ((function () {
                var m = Math.round(50 * (alpha.radius / 150));
                return [m, Math.round(m + (100 - m) * 0.66), 100];
            }()), _system.seed[8]);
            _system.A = alpha.mass > beta.mass ? alpha : beta;
            _system.B = _system.A.id === alpha.id ? beta : alpha;
            d = _system.A.radius + _system.B.radius + 20 + parseInt(_system.seed[0] + _system.seed[1], 16);
            a = Math.round( 100 * d * (beta.mass / (alpha.mass + beta.mass))) / -100;
            _system.A.handle.position.set(a, 0, 0);
            _system.B.handle.position.set(a + d, 0, 0);
            _system.handle.add(_system.A.handle);
            _system.handle.add(_system.B.handle);
        } else {
            _system.handle.add(_system.A.handle);
        }
        return;
    }
    function planets () {
        //  Do something...
    }
    function populate () {
        stars();
        planets();
    }
    function init () {
        canvas = grab('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width / canvas.height, 1, 20000);
        camera.position.set(0, 0, -2000);
        camera.lookAt(scene.position);
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(canvas.width, canvas.height);
        renderer.setClearColor(0x040d0c, 1);
        canvas.append(renderer.domElement);
        _system = new System(seed());
        populate();
        renderer.render(scene, camera);
    }

    init();
    _system.describe();
}());