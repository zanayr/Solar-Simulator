var system,
    axis;
(function () {
    var _AGE,
        _FPS = 60,
        _OBJECTS = {},
        _ORBITS = {},
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
        var geometry = new THREE.Geometry();
        geometry.vertices.push(a);
        geometry.vertices.push(b);
        this.geometry = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: color}));
        scene.add(this.geometry);
    }
    //  Axis Object  //
    function Axis () {
        this.x = new Line(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5000, 0, 0), 0xff0000);
        this.y = new Line(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5000, 0), 0x0000ff);
        this.z = new Line(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 5000), 0x00ff00);
        new Line(new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0), 0x303030);
        new Line(new THREE.Vector3(0, -5, 0), new THREE.Vector3(0, 5, 0), 0x303030);
        new Line(new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, 5), 0x303030);
    }
    Axis.prototype.hide = function () {
        this.x.geometry.visible = false;
        this.y.geometry.visible = false;
        this.z.geometry.visible = false;
    };
    Axis.prototype.show = function () {
        this.x.geometry.visible = true;
        this.y.geometry.visible = true;
        this.z.geometry.visible = true;
    };

    //  Orbital Ellipse  //
    function OrbitalEllipse (orbit, color) {
        console.log(orbit);
        var curve = new THREE.EllipseCurve(orbit.values.focus[0], 0, orbit.values.semiMajor, orbit.values.semiMinor, 0, 2 * Math.PI, false, 0),
            points = curve.getPoints(Math.abs(Math.floor(orbit.values.semiMajor))),
            geometry = new THREE.Geometry(),
            i;
        for (i in points)
            geometry.vertices.push(new THREE.Vector3(points[i].x, 0, points[i].y));
        this.curve = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: color}));
        this.foci = [
            new Line(new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0), color),
            new Line(new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, 5), color),
            new Line(new THREE.Vector3(orbit.values.focus[0] * 2 - 5, 0, 0), new THREE.Vector3(orbit.values.focus[0] * 2 + 5, 0, 0), color),
            new Line(new THREE.Vector3(orbit.values.focus[0] * 2, 0, -5), new THREE.Vector3(orbit.values.focus[0] * 2, 0, 5), color),
        ];
        scene.add(this.curve);
    }
    OrbitalEllipse.prototype.hide = function () {
        this.curve.visible = false;
    };
    OrbitalEllipse.prototype.hideFoci = function () {
        this.foci.forEach(function (line) {
            line.geometry.visible = false;
        });
    };
    OrbitalEllipse.prototype.show = function () {
        this.curve.visible = true;
    };
    OrbitalEllipse.prototype.showFoci = function () {
        this.foci.forEach(function (line) {
            line.geometry.visible = true;
        });
    };

    //  Sphere  //
    function Sphere (radius, color) {
        var u = Math.round(radius / 20) + 6;
        this.geometry = new THREE.Mesh(
            new THREE.SphereGeometry(radius, u, u),
            new THREE.MeshBasicMaterial({color: color, wireframe: true})
        );
    }

    //  Interpolated Loop Object  //
    function update (step) {
        var orbit;
        for (orbit in _ORBITS)
            _ORBITS[orbit].update(step * (Math.PI / 180));
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
    function Orbit (a, b, t) {
        //  a = semi-major, b = semi-minor, t = theta
        var e = a !== b ? Math.sqrt(1 - (Math.pow(b, 2) / Math.pow(a, 2))) : 0;
        this.id = uid();
        this.location = new THREE.Object3D();
        Object.defineProperties(this, {
            values: {
                value: {
                    semiMajor: a,
                    semiMinor: b,
                    c: a * e * 2,
                    e: e,
                    focus: [e * a, e * a * -1],
                    theta: t || 0
                }
            },
            x: {
                get: function () {
                    return this.location.position.x;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.location.position.x = value;
                }
            },
            y: {
                get: function () {
                    return this.location.position.y;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.location.position.y = value;
                }
            },
            z: {
                get: function () {
                    return this.location.position.z;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.location.position.z = value;
                }
            }
        });
        _ORBITS[this.id] = this;
        scene.add(this.location);
    }
    Orbit.prototype.update = function (r) {
        //  r = radian, p = polar coordinate
        var p = this.values.semiMajor * (1 - Math.pow(this.values.e, 2)) / (1 + this.values.e * Math.cos(this.values.theta + r));
        this.x = p * Math.cos(this.values.theta + r) + this.values.c;
        this.z = p * Math.sin(this.values.theta + r);
        this.values.theta += r; // Update theta to the new value
        this.location.children.forEach(function (child) { // Update all children's rotation
            child.rotation.y += r;
        });
    }

    //  Celestial Object  //
    //  The Celestial constructor should return a base celestial object with a radius,
    //  color and THREE.js sphere geometry
    function Celestial (radius, color) {
        Object.assign(this, new Sphere(radius, color));
        this.color = color;
        this.id = uid();
        this.radius = radius;
        Object.defineProperties(this, {
            orbit: {
                get: function () {
                    return this.store.orbit;
                },
                set: function (value) {
                    if (!this.store.orbit && value instanceof Orbit) {
                        value.location.add(this.geometry);
                        this.store.orbit = value;
                        this.orbitEllipse = new OrbitalEllipse(value, this.color);
                        this.orbitEllipse.hideFoci();
                    }
                }
            },
            store: {
                value: {
                    orbit: null
                }
            }
        });
        _OBJECTS[this.id] = this;
    }
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
        this.hydrogen = round(_SEED.parseSetRatio(1, 2) * 0.5 + 0.75, 2);
        this.iron = round(_SEED.parseSetRatio(0, 2) * 0.1 + 0.1, 2);
        this.name = _SEED.getSet(0, 2);
    }
    //  Uniary System  //
    //  The UniarySystem constructor should create a new system with one star orbiting
    //  the system center
    function UniarySystem () {
        System.call(this);
        this.A = new Star(getStarProperties(_PROB_ALPHA, _SEED.getSet(1, 2)));
        //  Set the orbit of the system to 0
        this.A.orbit = new Orbit(0, 0, 0);
        // createPlanets(this);
    }
    UniarySystem.prototype = Object.create(System.prototype);
    UniarySystem.prototype.constructor = UniarySystem;

    //  Binary System  //
    //  The BinarySystem constructor should create a new system with two stars orbiting
    //  a barrycenter
    function BinarySystem () {
        var a, b;
        System.call(this);
        this.A = new Star(getStarProperties(_PROB_ALPHA, _SEED.getSet(1, 2)));
        this.B = new Star(getStarProperties(_PROB_BETA, _SEED.getSet(2, 2)));
        //  Calculate the barrycenter and set the orbits of the binary system
        a = round(this.A.radius + this.B.radius + _SEED.parseSetRatio(1, 2) * 180 + 20, 2); // Distance
        b = round(a * (this.B.mass / (this.A.mass + this.B.mass)), 2) * -1; // Barrycenter
        this.A.orbit = new Orbit(b, b * 0.9, 0);
        this.B.orbit = new Orbit(a + b, (a + b) * 0.9, 0);
    }
    BinarySystem.prototype = Object.create(System.prototype);
    BinarySystem.prototype.constructor = BinarySystem;

    //  Build Functions  //
    //  The create function should create a new system and planets
    function create () {
        _SEED = new Seed(Seed.create(), 32);
        _AGE = round(_SEED.parseRatio(0) * 12 + 1.5, 2);
        // system = _SEED.parse(0) >= 4 ? new BinarySystem() : new UniarySystem();
        axis.hide();
        //  Debugging
        // system = new UniarySystem();
        system = new BinarySystem();
        // describe(system);
        // describe(system.A);
        // if (system instanceof BinarySystem)
        //     describe(system.B);
        
        // console.log('AGE: ', _AGE);
        
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