var system,
    axis;
(function () {
    var _AGE,
        _FPS = 60,
        _OBJECTS = {},
        _PLANET_MAX = 9,
        _PLANET_MIN = 3,
        _SEED,
        _SPEED = 0.025,
        _STAR_COLOR = [0xfd113c, 0xee0000, 0xf03412, 0xf04912, 0xe8601d, 0xf06b12, 0xfe9013, 0xffa500, 0xf3a214, 0xf3c220, 0xfade17, 0xf5d04c, 0xf5e54c, 0xf8ec81, 0xfff5c3, 0xfbf3b1, 0xfdfdd9, 0xffffff, 0xedeeff, 0xd4d6ff],
        _PROB_ALPHA = [50, 75, 90, 100], // M, K, G, A
        _PROB_BETA = [80, 90, 100], // M, K, G
        _PROB_PLANET = [25, 50, 75, 100], // M, T, N, J <-- fix probability 
        _PROB_MOON = [25, 50, 75],
        camera,
        loop,
        renderer,
        scene;
    /*  Notes
        If terrastial = 10r +- 6.5, minor planets would be <2.5r +- 2, and jovan moons would be 20 +- 10?
        Minor: 1-3, Terrastrial: 3-6, Super: 6-9, Neptunian: 9-12, Jovan: 12-15
        Atmospheres: >2
    */
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
    function Ellipse (f, major, minor, color) {
        var curve = new THREE.EllipseCurve(f, 0, Math.abs(major), Math.abs(minor), 0, 2 * Math.PI, false, 0),
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
    function Sphere (radius, color) {
        var u = Math.round(radius / 20) + 6;
        this.geometry = new THREE.Mesh(
            new THREE.SphereGeometry(radius, u, u),
            new THREE.MeshBasicMaterial({color: color, wireframe: true})
        );
    }

    //  Interpolated Loop Object  //
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

    //  Orbit Object  //
    //  The Orbit constructor returns an orbit object, used in the loop's update
    //  function to update a celestial object's position
    function OrbitII (major, minor, focus) {
        this.e = major !== minor ? Math.sqrt(1 - (Math.pow(minor, 2) / Math.pow(major, 2))) : 0;
        // this.F = Math.sqrt(Math.pow(major, 2) - Math.pow(minor, 2));
        this.a = major;
        this.b = minor;
        this.c = this.e * major;
        this.theta = 0;
        Object.defineProperty(this, 'r', {
            get: function () {
                return this.a * (1 - Math.pow(this.e, 2)) / (1 + this.e * Math.cos(this.theta));
            }
        });
    }
    OrbitII.prototype.setF = function (n) {
        this.F = n;
    }
    // function Orbit (major, minor) {
    //     this.major = major; // Semi-major axis
    //     this.minor = minor; // Semi-minor axis
    //     this.eccentricity = major !== minor ? Math.sqrt(1 - (Math.pow(minor, 2) / Math.pow(major, 2))) : 0; // Eccentricity
    //     this.focus = this.eccentricity * major; // Offset of focus
    // }
    //  The getPolar method returns the polar coordinate of the celestial object
    // Orbit.prototype.getPolar = function (angle) {
    //     return this.major * (1 - Math.pow(this.eccentricity, 2)) / (1 + this.eccentricity * Math.cos(angle));
    // };

    //  Celestial Object  //
    //  The Celestial constructor should return a base celestial object with a radius,
    //  color and THREE.js sphere geometry
    function Celestial (radius, color) {
        this.color = color;
        this.id = uid();
        this.object = new Sphere(radius, color);
        this.radius = radius;
        Object.defineProperties(this, {
            x: {
                get: function () {
                    return this.object.geometry.position.x;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.object.geometry.position.x = value;
                    return value;
                }
            },
            y: {
                get: function () {
                    return this.object.geometry.position.y;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.object.geometry.position.y = value;
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
    Celestial.prototype.setOrbit = function (orbit) {
        var f;
        if (orbit instanceof OrbitII) {
            this.orbit = orbit;
            this.orbit.ellipse = new Ellipse(orbit.c, orbit.a, orbit.b, this.color);
            new Line(new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0), this.color);
            new Line(new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, 5), this.color);
            new Line(new THREE.Vector3(2 * orbit.c - 5, 0, 0), new THREE.Vector3(2 * orbit.c + 5, 0, 0), this.color);
            new Line(new THREE.Vector3(2 * orbit.c, 0, -5), new THREE.Vector3(2 * orbit.c, 0, 5), this.color);
        }
        return this;
    };
    Celestial.prototype.update = function () {
        this.orbit.theta = system.radian;
        // this.object.geometry.rotation.y = system.radian * system.direction * -1;
        this.x = this.orbit.r * Math.cos(system.radian) + this.orbit.c * 2;
        this.z = this.orbit.r * Math.sin(system.radian);
        return this;
    };
    // Celestial.prototype.setOrbit = function (orbit) {
    //     var f;
    //     if (orbit instanceof Orbit) {
    //         this.orbit = orbit;
            
    //         // this.orbit.ellipse.hide();
    //         f = Math.sqrt(Math.pow(orbit.major, 2) - Math.pow(orbit.minor, 2));
    //         this.orbit.ellipse = new Ellipse(0, orbit.major, orbit.minor, this.color);
    //         this.orbit.f1 = new Line(new THREE.Vector3(f, 0, 0), new THREE.Vector3(f, 0, 100), this.color);
    //         this.orbit.f2 = new Line(new THREE.Vector3(f * -1, 0, 0), new THREE.Vector3(f * -1, 0, 100), this.color);
    //     }
    //     return this;
    // };
    // Celestial.prototype.update = function () {
    //     this.object.geometry.rotation.y = system.radian * system.direction * -1;
    //     this.x = this.orbit.focus + this.orbit.getPolar(system.radian) * Math.cos(system.radian) + Math.sqrt(Math.pow(this.orbit.major, 2) - Math.pow(this.orbit.minor, 2));
    //     this.z = this.orbit.getPolar(system.radian) * Math.sin(system.radian);
    //     return this;
    // };
    //  Planet  //
    function Planet (properties) {
        Celestial.call(this, properties.radius, properties.color);
        this.class = properties.type;
        this.mass = properties.mass;
    }
    Planet.prototype = Object.create(Celestial.prototype);
    Planet.prototype.constructor = Planet;
    //  Star Object  //
    //  The getStarProperties function should return an object with values for type,
    //  radius, mass and color for the seed and probability table passed
    function getStarProperties (table, seed) {
        var t, r, m, c;
        t = c = propbability(table, parseInt(seed, 16) / 255);
        r = Math.round((parseInt(seed, 16) / 255) * 20 + (c ? 20 + (c + 3) : 30));
        m = round(((parseInt(seed, 16) / 255) * 0.17 + 1.33) * volumeII(r) / 1000, 2);
        if (c && _AGE >= 10 - c) {
            r = Math.round((parseInt(seed, 16) / 255) * (c !== 3 ? 20 : 3) + (c !== 3 ? 240 : 6));
            t = c === 3 ? 4 : c;
        }
        c = _STAR_COLOR[(parseInt(seed[0], 16) % 4) + 4 * c];
        return {type: t, radius: r, mass: m, color: c};
    }
    //  Star  //
    function Star (properties) {
        Celestial.call(this, properties.radius, properties.color);
        this.class = properties.type;
        this.mass = properties.mass;
    }
    Star.prototype = Object.create(Celestial.prototype);
    Star.prototype.constructor = Star;

    //  System Objects  //
    function createPlanets (sys) {
        var i, lim, n, p;
        function next (last) {
            switch (last.class) {
                case 0: // Minor
                    break;
                case 1: // Terrestrial
                    break;
                case 2: // jovan
                default:
                    break;
            }
        }
        for (i = 0, lim = _SEED.parseSetRatio(4, 2) * (_PLANET_MAX - _PLANET_MIN) + _PLANET_MIN + 1; i < lim; i++) {
            n = String.fromCharCode(65 + i);
            Object.defineProperty(sys, n, {
                get: function () {
                    return _OBJECTS[this.objects[n + 'Id']]
                }
            });
            p = new Planet(getPlanetProperties(_PROB_PLANET, _SEED.getSet(4 + i, 2)), x);
            sys.objects[n + 'Id'] = p;
            x = getNextAu(p);
        }
        return a;

    }
    function System () {
        //  Create system properties
        this.direction = _SEED.parse(0) >= 8 ? 1 : -1;
        this.center = new THREE.Vector3(0, 0, 0);
        this.iron = round(_SEED.parseSetRatio(0, 2) * 0.1 + 0.1, 2);
        this.name = _SEED.getSet(0, 2);
        this.radian = 0; // Universal "time"
    }
    //  Uniary System  //
    //  The UniarySystem constructor should create a new system with one star orbiting
    //  the system center
    function UniarySystem () {
        var star;
        System.call(this);
        star = new Star(getStarProperties(_PROB_ALPHA, _SEED.getSet(1, 2)));
        Object.defineProperties(this, {
            A: {
                get: function () {
                    return _OBJECTS[this.objects.alphaId];
                }
            },
            objects: {
                value: {
                    alphaId: star.id
                }
            }
        });
        //  Set the orbit of the system to 0
        this.A.setOrbit(new OrbitII(108, 100, 1));
        //  Add the object geometry to the THREE scene object
        scene.add(this.A.object.geometry);
        // createPlanets(this);
    }
    UniarySystem.prototype = Object.create(System.prototype);
    UniarySystem.prototype.constructor = UniarySystem;
    //  Binary System  //
    //  The BinarySystem constructor should create a new system with two stars orbiting
    //  a barrycenter
    function BinarySystem () {
        var alpha, beta, a, b;
        System.call(this);
        alpha = new Star(getStarProperties(_PROB_ALPHA, _SEED.getSet(1, 2)));
        beta = new Star(getStarProperties(_PROB_BETA, _SEED.getSet(2, 2)));
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
        this.A.setOrbit(new OrbitII(b, b * 0.9, 1));
        this.B.setOrbit(new OrbitII(a + b, (a + b) * 0.9, -1));
        //  Add the object geometry to the THREE scene object
        scene.add(this.A.object.geometry);
        scene.add(this.B.object.geometry);
    }
    BinarySystem.prototype = Object.create(System.prototype);
    BinarySystem.prototype.constructor = BinarySystem;

    //  Build Functions  //
    //  The create function should create a new system and planets
    function create () {
        _SEED = new Seed(Seed.create(), 32);
        _AGE = round(_SEED.parseRatio(0) * 12 + 1.5, 2);
        // system = _SEED.parse(0) >= 4 ? new BinarySystem() : new UniarySystem();
        // system = new UniarySystem();
        system = new BinarySystem();
        //  Debugging
        describe(system);
        describe(system.A);
        if (system instanceof BinarySystem)
            describe(system.B);
        axis.hide();
        console.log('AGE: ', _AGE);
        new Line(new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0), 0xffffff);
        new Line(new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, 5), 0xffffff);
    }
    //  The init function creates a new THREE Scene and Camera object and set up a
    //  THREE.js scene
    function init () {
        var canvas = $('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width() / canvas.height(), 1, 20000);
        //  Position Camera
        camera.position.set(1300, 1300, 1300);
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
    init(); // Initialize environment
    start(); // Start system
}());