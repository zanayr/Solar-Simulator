/*  To Do List
-   Star's orbits, major and minor axis
*/
var _system,
    scene;


(function () {
    var canvas,
        loop,
        renderer,
        _objects = {},
        SEED,
        STAR_CLASS = ['M', 'K', 'G', 'F', 'A', 'D'],
        STAR_PROB = [50, 75, 85, 95, 100],
        STAR_COLOR = [0xfd113c, 0xee0000, 0xf03412, 0xf04912, 0xe8601d, 0xf06b12, 0xfe9013, 0xffa500, 0xf3a214, 0xf3c220, 0xfade17, 0xf5d04c, 0xf5e54c, 0xf8ec81, 0xfff5c3, 0xfbf3b1, 0xfdfdd9, 0xffffff, 0xedeeff, 0xd4d6ff];
        // STAR_COLOR = ['#fd113c', '#ee0000', '#f03412', '#f04912', '#e8601d', '#f06b12', '#fe9013', '#ffa500', '#f3a214', '#f3c220', '#fade17', '#f5d04c', '#f5e54c', '#f8ec81', '#fff5c3', '#fbf3b1', '#fdfdd9', '#ffffff', '#edeeff',  '#d4d6ff'];
    
    //  AUXILLARY FUNCTIONS  //
    //  Parse Probability Table  //
    function parse (p, s) {
        var a = Math.round(100 * (parseInt(s, 16) / 255)),
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
    function getBarrycenterOffset(a, m1, m2) {
        return Math.round(100 * a * (m2 / (m1 + m2))) / -100;
    }


    function Sphere (r, c) {
        var u = Math.round(r / 9) + 9,
            geometry = new THREE.SphereGeometry(r, u, u),
            material = new THREE.MeshBasicMaterial({color: c, wireframe: true});
        Object.defineProperties(this, {
            color: {
                value: c
            },
            geometry: {
                value: geometry
            },
            material: {
                value: material
            },
            mesh: {
                value: new THREE.Mesh(geometry, material)
            },
            radius: {
                value: r
            }
        });
    }


    //  SYSTEM OBJECTS  //
    function System () {
        Object.defineProperties(this, {
            handle: {
                value: new THREE.Object3D()
            },
            age: {
                value: Math.round(((10 * (parseInt(SEED[0], 16) / 15)) + 2 * parseInt(SEED[1] + SEED[2], 16) / 255) * 100) / 100
            },
            binary: {
                value: parseInt(SEED[3], 16) >= 10
            },
            iron: {
                value: Math.round(30 * (parseInt(SEED[4] + SEED[5], 16) / 255)) / 100
            },
            name: {
                value: SEED[6] + SEED[7]
            }
        });
        scene.add(this.handle);
    }
    System.prototype.describe = function () {
        console.log(this.name + '\n', 'age: ' + this.age + '\n', 'binary: ' + this.binary + '\n', 'iron: ' + this.iron + '\n', 'name: ' + this.name + '\n');
        console.log(this.name + 'A\n', 'class: ' + this.A.class + '\n', 'radius: ' + this.A.radius + '\n', 'color: ' + this.A.color + '\n', 'mass: ' + this.A.mass + '\n', 'density: ', + this.A.density + '\n');
        if (this.B)
            console.log(this.name + 'B\n', 'class: ' + this.B.class + '\n', 'radius: ' + this.B.radius + '\n', 'color: ' + this.B.color + '\n', 'mass: ' + this.B.mass + '\n', 'density: ', + this.B.density + '\n');
        return this;
    };

    //  Star Object  //
    function getStarProperties(seed) {
        var p = parse(STAR_PROB, seed),
            exhausted = p > 2 ? _system.age >= 14 - 2 * (p - 1) : _system.age >= 14 - p;
            color = (parseInt(seed[0], 16) % 4) + 4 * p,
            radius = Math.round(20 * (parseInt(seed[1], 16) / 15)) + (p ? 100 + (20 * p) : 50),
            volume = Math.round(133 * Math.PI * Math.pow(radius, 3)) / 100,
            mass = Math.round(141 * (volume / 10000)) / 100;
        if (exhausted && p > 2) {
            //  IF the star is exhausted and is above a 2, then it is a white dwarf
            color = (parseInt(seed[0], 16) % 4) + 16;
            radius = Math.round(6 * (parseInt(seed[1], 16) / 15)) + 9;
        } else if (exhausted) {
            //  If the star is exhausted, but is below a 3, then it is a red giant
            color = parseInt(seed[0], 16) % 4;
            radius = Math.round(20 * (parseInt(seed[1], 16) / 15)) + 120 + (20 * p);
        }
        return {
            class: exhausted && p > 2 ? 5 : p,
            color: color,
            mass: mass,
            radius: radius,
            volume: volume,
        }
    }
    function Star (seed) {
        Object.defineProperties(this, {
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
            e: {
                value: 0
            },
            radius: {
                get: function () {
                    return this.values.radius;
                }
            },
            values: {
                value: Object.assign({x: 0, y: 0, z: 0}, getStarProperties(seed))
            },
            x: {
                get: function () {
                    return this.values.x;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value)) {
                        this.values.x = value;
                        this.handle.position.x = value;
                    }
                    return value;
                }
            },
            y: {
                get: function () {
                    return this.values.y;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value)) {
                        this.values.y = value;
                        this.handle.position.y = value;
                    }
                    return value;
                }
            },
            z: {
                get: function () {
                    return this.values.z;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value)) {
                        this.values.z = value;
                        this.handle.position.z = value;
                    }
                    return value;
                }
            }
        });
        //  Set THREE sphere object
        Object.defineProperty(this, 'THREE', {
            value: new Sphere(this.radius, this.color)
        });
        //  Set incline and add to the sphere mesh to handle object
        this.THREE.geometry.rotateX((parseInt(SEED[0], 16) * Math.PI) / 180);
        this.handle.add(this.THREE.mesh);
        _objects[this.id] = this;
    }
    Star.prototype.position = function () {
        var i;
        for (i = 0; i < 3; i++)
            if (typeof arguments[i] !== 'number' || !isFinite(arguments[i]))
                return this;
        this.x = arguments[0];
        this.y = arguments[1];
        this.z = arguments[2];
        return this;
    };
    Star.prototype.update = function (step) {
        this.handle.rotation.y += 0.01;
        this.x = this.x * Math.cos(step);
        this.z = this.z * Math.sin(step);
        console.log(step);
        return this;
    };


    //  Loop Object  //
    
    function main (timestamp) {
        cycles = 0;
        if (loop.state) {
            if (timestamp < loop.lastFt + loop.timestep) {
                loop.id = window.requestAnimationFrame(main);
                return;
            }
            loop.delta += (timestamp - loop.lastFt);
            loop.lastFt = timestamp;
            if (timestamp > loop.lastFt + 1000) {
                loop.fps = 0.25 * loop.fts + 0.75 * loop.fps;
                loop.lastFps = timestamp;
                loop.fts = 0;
            }
            loop.fts++;
            while (loop.delta >= loop.timestep) {
                update();
                loop.delta -= loop.timestep;
                cycles++;
                if (cycles >= 240) {
                    loop.delta = 0;
                    break;
                }
            }
            render();
            loop.id = window.requestAnimationFrame(main);
            return;
        }
    }
    function  render () {
        renderer.render(scene, camera);
    }
    function start () {
        if (!loop.state) {
            loop.id = window.requestAnimationFrame(function (timestamp) {
                loop.state = 1;
                render();
                loop.lastFt = timestamp;
                loop.lastFps = timestamp;
                loop.fts = 0;
                loop.id = requestAnimationFrame(main);
            });
        }
        return;
    }
    function update () {
        var o;
        for (o in _objects)
            _objects[o].update(loop.timestep);
    }
    function Loop (fps) {
        Object.defineProperties(this, {
            delta: {
                get: function () {
                    return this.values.delta;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.values.delta = value;
                    return value;
                }
            },
            fps: {
                get: function () {
                    return this.values.fps;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.values.fps = value;
                    return value;
                }
            },
            fts: {
                get: function () {
                    return this.values.fts;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.values.fts = value;
                    return value;
                }
            },
            id: {
                get: function () {
                    return this.store.id;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.store.id = value;
                    return value;
                }
            },
            lastFps: {
                get: function () {
                    return this.values.lastFps;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.values.lastFps = value;
                    return value;
                }
            },
            lastFt: {
                get: function () {
                    return this.values.lastFt;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.values.lastFt = value;
                    return value;
                }
            },
            maxFps: {
                get: function () {
                    return this.values.maxFps;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.values.maxFps = value;
                    return value;
                }
            },
            state: {
                get: function () {
                    return this.store.state;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value) && (value === 0 || value === 1))
                        this.store.state = value;
                    return value;
                }
            },
            store: {
                value: {
                    id: 0,
                    state: 0,
                }
            },
            timestep: {
                get: function () {
                    return 1000 / this.maxFps;
                }
            },
            values: {
                value: {
                    delta: 0,
                    fps: 0,
                    fts: 0,
                    lastFps: 0,
                    lastFt: 0,
                    maxFps: fps
                }
            }
        });
    }
    


    //  Loop Functions  //
    

    //  Init Function
    function init () {
        canvas = grab('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width / canvas.height, 1, 20000);
        camera.position.set(0, -2000, 0);
        camera.lookAt(scene.position);
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(canvas.width, canvas.height);
        renderer.setClearColor(0x040d0c, 1);
        canvas.append(renderer.domElement);
        loop = new Loop(60);
    }

    //  Create Stars  //
    function stars () {
        var A, B, distance, offset; // Alpha, Beta, distance from A's center to B's center, offset of A from the Barrycenter
        //  Create alpha star
        A = new Star(SEED[0] + SEED[1]);
        if (!_system.binary) {
            //  Set system alpha and add the new star to the system
            _system.A = A;
            _system.handle.add(_system.A.handle);
        } else {
            //  Create beta star
            B = new Star(SEED[1] + SEED[2]);
            //  The largest of the two stars will be the system's alpha
            _system.A = A.mass > B.mass ? A : B;
            _system.B = _system.A.id === A.id ? B : A;
            //  Calculate the Barrycenter of the two stars, which will be the center of the system
            distance = A.radius + B.radius + parseInt(SEED[0] + SEED[1], 16) + 20; // Minimum value of two radii and 20
            offset = getBarrycenterOffset(distance, A.mass, B.mass);
            //  Set star positions
            _system.A.x = offset;
            _system.B.x = offset + distance;
            //  Add the stars to the system
            _system.handle.add(_system.A.handle);
            _system.handle.add(_system.B.handle);
        }
        return;
    }
    function create () {
        SEED = seed();
        _system = new System();
        stars();
    }

    init();
    create();
    // renderer.render(scene, camera);
    _system.describe();
    start();
}());