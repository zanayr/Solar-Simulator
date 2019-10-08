/*  NOTES:
    Seed Map:
    [0, 3]      System
    [4, 7]      Alpha Star
    [8, 11]     Beta Star
    [12, 19]    Planets
    [20, 27]    Moons
    [28, 32]    Features (Rings, Asteroids, etc.)

    Last:
    
*/
var system,
    OBJECTS;
(function () {
    var camera,
        loop,
        renderer,
        scene,
        SEED;
    
    //  Auxillary Functions  //
    function parse (table, value) {
        var v = Math.round(100 * value),
            len,
            i;
        for (i = 0, len = table.length; i < len; i++)
            if (v <= table[i])
                return i;
        return len;
    }
    function round (number, decimals) {
        var q = Math.pow(10, decimals || 2);
        return Math.round(q * number) / q;
    }
    function uuid () {
        return ('xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    function volume (radius) {
        return (4 / 3) * Math.PI * Math.pow(radius, 3);
    }


    //  Store  //
    function Store () {
        Object.defineProperties(this, {
            store: {
                value: {}
            },
            uuids: {
                get: function () {
                    return Object.keys(this.store);
                }
            },
            length: {
                get: function () {
                    return Object.keys(this.store).length;
                }
            }
        });
    }
    Store.prototype.add = function (object) {
        if (object instanceof Celestial && !this.has(object.uuid)) {
            this.store[object.uuid] = object;
            return true;
        }
        return false;
    };
    Store.prototype.delete = function (uuid) {
        if (this.has(uuid)) {
            delete this.store[uuid];
            return true;
        }
        return false;
    };
    Store.prototype.each = function (fn) {
        var i;
        for (i = 0, len = this.length; i < len; i++)
            fn.apply(null, [this.store[this.uuids[i]], i]);
        return this;
    };
    Store.prototype.get = function (uuid) {
        if (this.has(uuid))
            return this.store[uuid];
        return null;
    }
    Store.prototype.has = function (uuid) {
        return this.uuids.includes(uuid);
    };

    //  Collection  //
    function Collection () {
        Object.defineProperties(this, {
            store: {
                value: [],
                writable: true
            },
            length: {
                get: function () {
                    return this.store.length;
                }
            },
            uuids: {
                get: function () {
                    this.store.slice(0);
                }
            }
        });
    }
    Collection.prototype.add = function (object) {
        if (!this.store.includes(object.uuid))
            this.store = this.store.concat(object.uuid);
        return this.length;
    };
    Collection.prototype.remove = function (uuid) {
        if (this.store.includes(uuid)) {
            this.store = this.store.filter(function (id) {
                return uuid !== id;
            });
            return true;
        }
        return false;
    };
    Collection.prototype.each = function (fn) {
        var i;
        for (i = 0, len = this.length; i < len; i++)
            fn.apply(null, [OBJECTS.get(this.store[i]), i]);
        return this;
    };
    Collection.prototype.get = function (uuid) {
        if (this.store.includes(uuid))
            return OBJECTS.get(uuid);
        return null;
    };


    //  Loop  //
    function update (step) {
        OBJECTS.each(function (object) {
            object.update(step * (Math.PI / 180));
        });
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
                update(360 / loop.timestep);
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
    
    //  Seed  //
    function Seed32 (str) {
        this.value = (function () {
            var s = str.replace(/\s/, '');
            while (s.length < 32)
                s += String.fromCharCode(Math.round(Math.random() * 25) + (Math.random() > 0.5 ? 97 : 65));
            return s;
        }()).replace(/[\da-z]/ig, function (c) {
            return (c.charCodeAt(0) % 16).toString(16);
        });
    }
    Seed32.prototype.get = function (index) {
        return this.value[index % 32];
    };
    Seed32.prototype.parse = function (index) {
        return parseInt(this.value[index % 32], 16);
    };
    Seed32.prototype.parseRatio = function (index) {
        return parseInt(this.value[index % 32], 16) / 15;
    };
    Seed32.prototype.getSet = function (index, len) {
        var l = len ? len : 2;
        if (index + l >= this.value.length)
            return this.value.slice(index, this.value.length) + this.getSet(0, index + l - this.value.length);
        return this.value.slice(index, index + l);
    };
    Seed32.prototype.parseSet = function (index, len) {
        var l = len ? len : 2;
        return parseInt(this.getSet(index, l), 16);
    };
    Seed32.prototype.parseSetRatio = function (index, len) {
        var l = len ? len : 2;
        return this.parseSet(index, l) / (Math.pow(16, l) - 1);
    };
    Seed32.create = function () {
        return ('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx').replace(/x/g, function () {
            return String.fromCharCode(Math.round(Math.random() * 25) + (Math.random() > 0.5 ? 97 : 65));
        });
    };

    //  Orbit Ellipse  //
    function OrbitEllipse (a, b, f) {
        var curve = new THREE.EllipseCurve(f, 0, a, b, 0, 2 * Math.PI, false, 0),
            points = curve.getPoints(Math.abs(Math.floor(a))),
            geometry = new THREE.Geometry(),
            p;
        for (p in points)
            geometry.vertices.push(new THREE.Vector3(points[p].x, 0, points[p].y));
        this.line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: 0xffffff}));
        this.line.visible = false;
    }
    OrbitEllipse.prototype.hide = function () {
        this.line.visible = false;
    };
    OrbitEllipse.prototype.show = function () {
        this.line.visible = true;
    };
    

    //  Celestial  //
    function Celestial () {
        this.satellites = new Collection();
        this.uuid = uuid();
        Object.defineProperties(this, {
            prime: {
                get: function () {
                    if (this.store.primeUuid)
                        return OBJECTS.get(this.store.primeUuid);
                    return {x: 0, y: 0, z: 0};
                }
            },
            store: {
                value: {
                    mesh: null,
                    object: new THREE.Object3D(),
                    primeUuid: null
                }
            },
            values: {
                value: {}
            },
            x: {
                get: function () {
                    return this.store.object.position.x;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.store.object.position.x = value;
                }
            },
            y: {
                get: function () {
                    return this.store.object.position.y;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.store.object.position.y = value;
                }
            },
            z: {
                get: function () {
                    return this.store.object.position.z;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.store.object.position.z = value;
                }
            }
        });
        OBJECTS.add(this);
        scene.add(this.store.object);
    }
    Celestial.prototype.add = function (satellite) {
        this.satellites.add(satellite.setPrime(this));
        return this;
    };
    Celestial.prototype.setMesh = function (mesh) {
        if (!this.store.mesh && mesh instanceof THREE.Mesh) {
            this.store.object.add(mesh);
            this.store.mesh = mesh;
        }
        return this;
    };
    Celestial.prototype.setOrbit = function (a, b, theta) {
        var e = a !== b ? Math.sqrt(1 - (Math.pow(b, 2) / Math.pow(a, 2))) : 0;
        this.values.semiMajorAxis = a;
        this.values.semiMinorAxis = b;
        this.values.c = 2 * e * a;
        this.values.e = e;
        this.values.focus = [e * a, e * a * -1];
        this.values.theta = theta;
        this.values.v = this instanceof Star ? 0.005 : Math.abs(1 / b) * 2;
        return this;
    };
    Celestial.prototype.setPrime = function (prime) {
        if (this.store.primeUuid)
            this.satellites.remove(this.uuid);
        this.store.primeUuid = prime.uuid;
        return this;
    };
    Celestial.prototype.update = function (radians) {
        var r = this.values.theta + (radians * this.values.v),
            p = this.values.semiMajorAxis * (1 - Math.pow(this.values.e, 2)) / (1 + this.values.e * Math.cos(r));
        this.x = p * Math.cos(r) + this.values.c + this.prime.x;
        this.z = p * Math.sin(r) + this.prime.z;
        // <-- Set rotation here
        this.values.theta = r;
    };

    //  Satellite  //
    function Satellite (c, radius, mass) {
        Celestial.call(this);
        this.class = c;
        this.radius = 5;
        this.mass = 5;
        this.store.radiusSeed = radius;
        this.store.massSeed = mass;
    }
    Satellite.prototype = Object.create(Celestial.prototype);
    Satellite.prototype.constructor = Satellite;

    //  Planet  //
    function Planet (c, radius, mass) {
        Celestial.call(this);
        this.class = c;
        this.radius = 10;
        this.mass = 10;
        this.store.radiusSeed = radius;
        this.store.massSeed = mass;
    }
    Planet.prototype = Object.create(Celestial.prototype);
    Planet.prototype.constructor = Planet;

    //  Star  //
    function Star (c, radius, mass) {
        Celestial.call(this);
        this.class = c;
        this.radius = round(parseInt(radius, 16) / 255 * 20 + (c ? 140 + (c - 1) * 20 : 40));
        this.mass = round((parseInt(mass, 16) / 255 * 0.17 + 1.33) * volume(this.radius) / 10000);
        this.store.radiusSeed = radius;
        this.store.massSeed = mass;
    }
    Star.prototype = Object.create(Celestial.prototype);
    Star.prototype.constructor = Star;

    //  System  //
    function System () {
        this.age = round(SEED.parseSetRatio(0) * 12 + 1.8);
        this.binary = SEED.parseSetRatio(1) > 0.4;
        this.name = SEED.getSet(0);
        Object.defineProperty(this, 'store', {
            value: {}
        });
    }
    System.prototype.add = function (object, name) {
        if (object instanceof Star) {
            (function () {
                var i = object.class,
                    v = i !== 3 ? 20 : 3,
                    m = i !== 3 ? 240 : 6;
                if (i && this.age >= 10 - i) {
                    object.radius = round(parseInt(object.store.radiusSeed, 16) / 255 * v + m, 2);
                    object.class = i === 3 ? 5 : 4;
                }
            }());
        }
        Object.defineProperty(this, name, {
            get: function () {
                return OBJECTS.get(this.store[name + 'Id']);
            }
        });
        Object.defineProperty(this.store, name + 'Id', {
            value: object.uuid
        });
    };
    System.prototype.pause = function () {
        stop();
    };
    System.prototype.showOrbits = function () {
        OBJECTS.each(function (object) {
            object.orbitEllipse.show();
        });
    };
    System.prototype.hideOrbits = function () {
        OBJECTS.each(function (object) {
            object.orbitEllipse.hide();
        });
    };

    //  Uniary and Binary Functions  //
    function uniary () {
        var sys = new System();
        sys.add(new Star(parse([50, 75, 90], SEED.parseSetRatio(4)), SEED.getSet(5), SEED.getSet(6)), 'A');
        sys.A.setOrbit(0, 0, 0);
        return sys;
    }
    function binary () {
        var s1, s2, a, b, sys = new System();
        s1 = new Star(parse([50, 75, 90], SEED.parseSetRatio(4)), SEED.getSet(5), SEED.getSet(6));
        s2 = new Star(parse([80, 90], SEED.parseSetRatio(8)), SEED.getSet(9), SEED.getSet(10));
        sys.add(s1.mass >= s2.mass ? s1 : s2, 'A');
        console.log(sys.A);
        sys.add(sys.A.uuid === s1.uuid ? s2 : s1, 'B');
        a = round(sys.A.radius + sys.B.radius + SEED.parseSetRatio(2) * 180 + 20);
        b = round(a * (sys.B.mass / (sys.A.mass + sys.B.mass)), 2) * -1; // Barrycenter
        sys.A.setOrbit(b, b * 0.98, 0);
        sys.B.setOrbit(a + b, (a + b) * 0.98, 0);
        return sys;
    }

    
    //  Initialization Functions  //
    function create () {
        var planet, moon;
        SEED = new Seed32(Seed32.create());
        system = SEED.parseSetRatio(1) > 0.4 ? binary() : uniary();
        planet = new Planet(parse([20, 40, 60, 80], SEED.parseSetRatio(12)), SEED.getSet(13), SEED.getSet(14));
        system.A.add(planet);
        planet.setOrbit(100, 100, Math.random() * 360);
        moon = new Satellite(parse([20, 40, 60, 80], SEED.parseSetRatio(20)), SEED.getSet(21), SEED.getSet(22));
        planet.add(moon);
        moon.setOrbit(20, 20, Math.random() * 360);
    }
    function build () {
        OBJECTS.each(function (object) {
            var u = v = Math.floor(object.radius / 20 + 6);
                g = new THREE.SphereGeometry(object.radius, u, v),
                c = 0;
            if (object instanceof Star)
                c = object.class;
            object.setMesh(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
                color: 0xffffff,//COLORS[(parseInt(object.store.colorSeed, 16) % 4) + 4 * c],
                wireframe: true
            })));
            object.orbitEllipse = new OrbitEllipse(object.values.semiMajorAxis, object.values.semiMinorAxis, object.values.focus[0]);
            scene.add(object.orbitEllipse.line);
        });
    }
    function init () {
        var canvas = $('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width() / canvas.height(), 1, 20000);
        renderer = new THREE.WebGLRenderer();

        camera.position.set(1300, 1300, 1300);
        camera.lookAt(scene.position);

        renderer.setSize(canvas.width(), canvas.height());
        renderer.setClearColor(0x000000, 1);

        canvas.append(renderer.domElement);

        loop = new InterpolatedLoop(60);
        OBJECTS = new Store();

        create();
        build();
        start();
    }

    init();
}());