var system,
    axis;
(function () {
    var _AGE,
        _FPS = 60,
        _OBJECTS = {},
        _SEED,
        _SPEED = 0.025,
        _STAR_COLOR = [0xfd113c, 0xee0000, 0xf03412, 0xf04912, 0xe8601d, 0xf06b12, 0xfe9013, 0xffa500, 0xf3a214, 0xf3c220, 0xfade17, 0xf5d04c, 0xf5e54c, 0xf8ec81, 0xfff5c3, 0xfbf3b1, 0xfdfdd9, 0xffffff, 0xedeeff, 0xd4d6ff],
        _ALPHA_PROB = [50, 75, 90, 100],
        _BETA_PROB = [80, 90, 100],
        camera,
        loop,
        renderer,
        scene;
    //  Auxillary Functions  //
    function describe (object) {
        console.log(Object.getPrototypeOf(object).constructor.name);
        Object.keys(object).forEach(function (key) {
            console.log(key + ': ', object[key]);
        });
    }
    function iterate (n, fn) {
        if (n > 0) {
            fn.call(null, n);
            iterate(n - 1, fn);
        }
        return;
    }
    function propbability (table, value) {
        var a = Math.round(100 * value),
            i;
        for (i = 0; i < table.length; i++)
            if (a <= table[i])
                return i;
        return 0;
    }
    function round (n, d) {
        var q = Math.pow(10, d || 2);
        return Math.round(q * n) / q;
    }
    function uid () {
        return ('xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    // function volume (r) {
    //     return round((4 / 3) * Math.PI * Math.pow(r, 3) / 1000, 2);
    // }
    function volumeII (r) {
        return 4 / 3 * Math.PI * Math.pow(r, 3);
    }


    //  THREE Objects  //
    //  Line Object  //
    function Line (a, b, color) {
        this.geometry = new THREE.Geometry();
        this.material = new THREE.LineBasicMaterial({color: color});
        this.geometry.vertices.push(a);
        this.geometry.vertices.push(b);
        this.object = new THREE.Line(this.geometry, this.material);
        scene.add(this.object);
    }
    //  Axis Object  //
    function Axis () {
        this.x = new Line(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5000, 0, 0), 0xff0000);
        this.y = new Line(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5000, 0), 0x0000ff);
        this.z = new Line(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 5000), 0x00ff00);
    }
    Axis.prototype.hide = function () {
        this.x.object.visible = false;
        this.y.object.visible = false;
        this.z.object.visible = false;
    };
    Axis.prototype.show = function () {
        this.x.object.visible = true;
        this.y.object.visible = true;
        this.z.object.visible = true;
    };
    //  Ellipse Object  //
    function Ellipse (major, minor, color) {
        var curve = new THREE.EllipseCurve(0, 0, Math.abs(major), Math.abs(minor), 0, 2 * Math.PI, false, 0),
            points = curve.getPoints(Math.abs(major)),
            geometry = new THREE.Geometry(),
            i;
        for (i in points)
            geometry.vertices.push(new THREE.Vector3(points[i].x, 0, points[i].y));
        this.curve = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: color}));
        scene.add(this.curve);
    }
    Ellipse.prototype.hide = function () {
        this.curve.visible = false;
    };
    Ellipse.prototype.show = function () {
        this.curve.visible = true;
    };
    //  Sphere Object  //
    // function Sphere (radius, color) {
    //     var u = Math.round(radius / 20) + 6;
    //     this.geometry = new THREE.SphereGeometry(radius, u, u);
    //     this.material = new THREE.MeshBasicMaterial({color: color, wireframe: true});
    //     this.object = new THREE.Mesh(this.geometry, this.material);
    // }
    function SphereII (radius, color) {
        var u = Math.round(radius / 20) + 6;
        this.geometry = new THREE.Mesh(
            new THREE.SphereGeometry(radius, u, u),
            new THREE.MeshBasicMaterial({color: color, wireframe: true})
        );
    }

    //  Loop Objects and Functions  //
    function update (step) {
        var object;
        system.radian += step * (Math.PI / 180);
        for (object in _OBJECTS)
            _OBJECTS[object].update();
    }
    function render (interpolation) {
        renderer.render(scene, camera);
    }
    function start () {
        if (!loop.state) {
            loop.frameId = window.requestAnimationFrame(function (timestamp) {
                loop.state = 1;
                render(1);
                loop.lastFt = timestamp;
                loop.lastFps = timestamp;
                loop.fts = 0;
                loop.frameId = window.requestAnimationFrame(main);
                return;
            });
        }
        return;
    }
    function stop () {
        loop.state = 0;
        window.cancelAnimationFrame(loop.frameId);
    }
    function main (timestamp) {
        var cycles = 0;
        if (loop.state) {
            //  Check if main has been called to early
            if (timestamp < loop.lastFt + loop.timestep) {
                loop.frameId = window.requestAnimationFrame(main);
                return;
            }
            loop.delta += timestamp - loop.lastFt;
            loop.lastFt = timestamp;
            //  Check if main was called to late
            if (timestamp > loop.lastFt + 1000) {
                loop.fps = 0.25 * loop.fts * 0.75 * loop.fps;
                loop.lastFps = timestamp;
                loop.fts = 0;
            }
            loop.fts++;
            //  Update Elements
            while (loop.delta >= loop.timestep) {
                update(360 / loop.timestep * _SPEED);
                loop.delta -= loop.timestep;
                cycles++;
                if (cycles >= 240) {
                    loop.delta = 0;
                    break;
                }
            }
            //  Render Elements
            render(loop.delta / loop.timestep);
            loop.framId = window.requestAnimationFrame(main);
            return;
        }
    }
    function InterpolatedLoop (max) {
        this.delta = 0;
        this.fps = 0;
        this.frameId = 0;
        this.fts = 0;
        this.lastFps = 0;
        this.lastFt = 0;
        this.maxFps = max;
        this.state = 0;
        Object.defineProperties(this, {
            timestep: {
                get: function () {
                    return 1000 / this.maxFps;
                }
            }
        });
    }

    
    //  Seed Object  //
    function Seed (str, len) {
        function sanitize (s) {
            var l = len || 32;
            s = s.replace(/\s/, '');
            while (s.length < l)
                s += s;
            return s.slice(0, l);
        }
        this.value = (sanitize(str)).replace(/[\da-z]/ig, function (c) {
            return (c.charCodeAt(0) % 16).toString(16);
        });
    }
    Seed.prototype.get = function (index) {
        return this.value[index];
    };
    Seed.prototype.getSet = function (start, count) {
        count = count ? count : 1;
        if (start + count >= this.value.length)
            return this.value.slice(start, this.value.length) + this.getSet(0, start + count - this.value.length);
        return this.value.slice(start, start + count);
    };
    Seed.prototype.parse = function (index) {
        return parseInt(this.get(index), 16);
    };
    Seed.prototype.parseRatio = function (index) {
        return this.parse(index) / 15;
    }
    Seed.prototype.parseSet = function (start, count) {
        return parseInt(this.getSet(start, count), 16);
    };
    Seed.prototype.parseSetRatio = function (start, count) {
        return this.parseSet(start, count) / (Math.pow(16, count) - 1);
    };
    Seed.create = function (len) {
        var s = '';
        iterate(len || 32, function () {
            s += 'x';
        });
        return (s).replace(/x/g, function (c) {
            return String.fromCharCode(Math.round(Math.random() * 25) + (Math.random() > 0.5 ? 97 : 65));
        });
    };


    function OrbitII (major, minor) {
        this.major = major; // Semi-major axis
        this.minor = minor; // Semi-minor axis
        this.eccentricity = major !== minor ? Math.sqrt(1 - (Math.pow(minor, 2) / Math.pow(major, 2))) : 0; // Eccentricity
        this.focus = this.eccentricity * major; // Offset of focus
    }
    OrbitII.prototype.getPolar = function (angle) {
        return this.major * (1 - Math.pow(this.eccentricity, 2)) / (1 + this.eccentricity * Math.cos(angle));
    };

    function CelestialII (radius, color) {
        this.color = color;
        this.id = uid();
        this.object = new SphereII(radius, color);
        this.radius = radius;
        Object.defineProperties(this, {
            x: {
                get: function () {
                    return this.object.geometry.position.x;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.object.geometry.position.x = value * system.direction;
                    return value;
                }
            },
            y: {
                get: function () {
                    return this.object.geometry.position.y;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.object.geometry.position.y = value * system.direction;
                    return value;
                }
            },
            z: {
                get: function () {
                    return this.object.geometry.position.z;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.object.geometry.position.z = value;
                    return value;
                }
            }
        });
        _OBJECTS[this.id] = this;
    }
    CelestialII.prototype.setOrbit = function (orbit) {
        if (orbit instanceof OrbitII) {
            this.orbit = orbit;
            this.orbit.ellipse = new Ellipse(orbit.major, orbit.minor, this.color);
        }
        return this;
    };
    CelestialII.prototype.update = function () {
        this.object.geometry.rotation.y = system.radian * system.direction * -1;
        this.x = this.orbit.focus + this.orbit.getPolar(system.radian) * Math.cos(system.radian);
        this.z = this.orbit.getPolar(system.radian) * Math.sin(system.radian);
        return this;
    };

    function StarII (properties) {
        CelestialII.call(this, properties.radius, properties.color);
        this.class = properties.type;
        this.mass = properties.mass;
    }
    StarII.prototype = Object.create(CelestialII.prototype);
    StarII.prototype.constructor = StarII;

    function getStarProperties (table, seed) {
        var t, r, m, c, variance, min;
        //  Get star "temperature" from the probablility table
        c = propbability(table, parseInt(seed, 16) / 255);
        //  Check if the star is exhausted
        if (c && _AGE >= 10 - c) {
            //  If it is, the star will either be a red giant or white dwarf
            variance = c !== 3 ? 20 : 3;
            min = c !== 3 ? 240 : 6;
            t = c === 3 ? 4 : c;
        } else {
            //  If it is not, set the default values
            variance = 20;
            min = c ? 20 * (c + 3) : 30;
            t = c;
        }
        //  Get the star radius and mass
        r = Math.round((parseInt(seed, 16) / 255) * variance + min);
        m = round(((parseInt(seed, 16) / 255) * 0.17 + 1.33) * volumeII(r) / 1000, 2);
        //  Get the color of the star with the seed and "temperature"
        c = _STAR_COLOR[(parseInt(seed[0], 16) % 4) + 4 * c];
        return {type: t, radius: r, mass: m, color: c};
    }

    function System () {
        //  Create system properties
        this.direction = _SEED.parse(0) >= 8 ? 1 : -1;
        this.center = new THREE.Vector3(0, 0, 0);
        this.iron = round(_SEED.parseSetRatio(0, 2) * 0.1 + 0.1, 2);
        this.name = _SEED.getSet(0, 2);
        this.radian = 0; // Universal "time"
    }
    function UniarySystem () {
        var star;
        System.call(this);
        star = new StarII(getStarProperties(_ALPHA_PROB, _SEED.getSet(1, 2)));
        Object.defineProperties(this, {
            A: {
                get: function () {
                    return _OBJECTS[this.stars.A];
                }
            },
            stars: {
                value: {
                    A: star.id
                }
            }
        });
        //  Set the orbit of the system to 0
        this.A.setOrbit(new OrbitII(0, 0));
        //  Add the object geometry to the THREE scene object
        scene.add(this.A.object.geometry);
    }
    UniarySystem.prototype = Object.create(System.prototype);
    UniarySystem.prototype.constructor = UniarySystem;
    function BinarySystem () {
        var alpha, beta, a, b;
        System.call(this);
        alpha = new StarII(getStarProperties(_ALPHA_PROB, _SEED.getSet(1, 2)));
        beta = new StarII(getStarProperties(_BETA_PROB, _SEED.getSet(2, 2)));
        Object.defineProperties(this, {
            A: {
                get: function () {
                    return _OBJECTS[this.objects.alphaId];
                }
            },
            B: {
                get: function () {
                    return _OBJECTS[this.objects.betaId];
                }
            },
            objects: {
                value: {
                    alphaId: alpha.id,
                    betaId: beta.id
                }
            }
        });
        //  Calculate the barrycenter and set the orbits of the binary system
        a = round(alpha.radius + beta.radius + _SEED.parseSetRatio(1, 2) * 180 + 20, 2); // Distance
        b = round(a * (beta.mass / (alpha.mass + beta.mass)), 2) * -1; // Barrycenter
        console.log(a, b);
        this.A.setOrbit(new OrbitII(b, b));
        this.B.setOrbit(new OrbitII(a + b, a + b));
        //  Add the object geometry to the THREE scene object
        scene.add(this.A.object.geometry);
        scene.add(this.B.object.geometry);
    }
    BinarySystem.prototype = Object.create(System.prototype);
    BinarySystem.prototype.constructor = BinarySystem;

    //  Program Functions  //
    function create () {
        _SEED = new Seed(Seed.create(), 32);
        _AGE = round(_SEED.parseRatio(0) * 12 + 1.5, 2);
        system = _SEED.parse(0) >= 4 ? new BinarySystem() : new UniarySystem();
        //  Debugging
        describe(system);
        describe(system.A);
        if (system instanceof BinarySystem)
            describe(system.B);
        axis.hide();
    }
    function init () {
        var canvas = $('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width() / canvas.height(), 1, 20000);
        //  Position Camera
        camera.position.set(2000, 2000, 2000);
        camera.lookAt(scene.position);
        //  Set renderer
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(canvas.width(), canvas.height());
        renderer.setClearColor(0x000000, 1);
        //  Add renderer's dom element to canvas
        canvas.append(renderer.domElement);
        //  Create program loop
        loop = new InterpolatedLoop(_FPS);
        //  Build Environment
        axis = new Axis();
        //  Create system seed and new system object
        create();
    }

    //  Init and a start program
    init();
    start();
    // setTimeout(function () {
    //     stop();
    // }, 3000);
    // renderer.render(scene, camera);
}());