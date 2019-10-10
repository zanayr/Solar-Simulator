/*  NOTES:
    Seed32 Map:
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
        AU = 300,
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
    function radian (degree) {
        return degree * (Math.PI / 180);
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
        var object;
        if (this.has(uuid)) {
            object = this.store[uuid];
            object.satellites.each(function (satellite) {
                satellite.store.primeUuid = null;
            });
            scene.remove(scene.getObjectByName(uuid));
            // object.object.geometry.dispose();
            // object.object.materials.dispose();
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
        return object.uuid;
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
        var i, len;
        for (i = 0, len = loop.updates.length; i < len; i++)
            loop.updates[i](radian(step));
        // OBJECTS.each(function (object) {
        //     object.update(step * (Math.PI / 180));
        // });
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
                update(360 / loop.timestep * 0.01);
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
            },
            updates: {
                value: [],
                writable: true
            }
        });
    }
    InterpolatedLoop.prototype.add = function (update) {
        if (!this.state) {
            this.updates.push(update);
        }
    };
    
    //  Seed32  //
    function Seed () {
        this.value = null;
    }
    Seed.prototype.get = function (index) {
        return this.value[index % 32];
    };
    Seed.prototype.parse = function (index) {
        return parseInt(this.value[index % 32], 16);
    };
    Seed.prototype.parseRatio = function (index) {
        return parseInt(this.value[index % 32], 16) / 15;
    };
    Seed.prototype.getSet = function (index, len) {
        var l = len ? len : 2;
        if (index + l >= this.value.length)
            return this.value.slice(index, this.value.length) + this.getSet(0, index + l - this.value.length);
        return this.value.slice(index, index + l);
    };
    Seed.prototype.parseSet = function (index, len) {
        var l = len ? len : 2;
        return parseInt(this.getSet(index, l), 16);
    };
    Seed.prototype.parseSetRatio = function (index, len) {
        var l = len ? len : 2;
        return this.parseSet(index, l) / (Math.pow(16, l) - 1);
    };
    function Seed4 (str) {
        Seed.call(this);
        this.value = str.replace(/\s/, '')
            .slice(0, 4)
            .replace(/[\da-z]/ig, function (c) {
                return (c.charCodeAt(0) % 16).toString(16);
            });
    }
    Seed4.prototype = Object.create(Seed.prototype);
    Seed4.prototype.constructor = Seed4;
    Seed4.create = function () {
        return (''.padStart(4, 'x')).replace(/x/g, function () {
            return String.fromCharCode(Math.round(Math.random() * 25) + (Math.random() > 0.5 ? 97 : 65));
        });
    };
    function Seed32 (str) {
        Seed.call(this);
        this.value = (function () {
            var s = str.replace(/\s/, '');
            while (s.length < 32)
                s += String.fromCharCode(Math.round(Math.random() * 25) + (Math.random() > 0.5 ? 97 : 65));
            return s;
        }()).replace(/[\da-z]/ig, function (c) {
            return (c.charCodeAt(0) % 16).toString(16);
        });
    }
    Seed32.create = function () {
        return (''.padStart(32, 'x')).replace(/x/g, function () {
            return String.fromCharCode(Math.round(Math.random() * 25) + (Math.random() > 0.5 ? 97 : 65));
        });
    };
    Seed32.prototype = Object.create(Seed.prototype);
    Seed32.prototype.constructor = Seed32;
    //  Orbit Ellipse  //
    function ellipse (x, a, b) {
        var c = new THREE.EllipseCurve(x, 0, a, b, 0, 2 * Math.PI, false, 0),
            p = c.getPoints(Math.abs(Math.floor(a))),
            g = new THREE.Geometry(),
            i;
        for (i in p)
            g.vertices.push(new THREE.Vector3(p[i].x, 0, p[i].y));
        return new THREE.Line(g, new THREE.LineBasicMaterial({color: 0xffffff}));
    }
    function focus () {
        var g1 = new THREE.Geometry(),
            g2 = new THREE.Geometry();
        g1.vertices.push(new THREE.Vector3(-5, 0, 0));
        g1.vertices.push(new THREE.Vector3(5, 0, 0));
        g2.vertices.push(new THREE.Vector3(0, 0, -5));
        g2.vertices.push(new THREE.Vector3(0, 0, 5));
        return [new THREE.Line(g1, new THREE.LineBasicMaterial({color: 0xffffff})), new THREE.Line(g2, new THREE.LineBasicMaterial({color: 0xffffff}))];
    }


    function Orbit (a, e) {
        var b = Math.sqrt((a * (1 - e)) * (a * (1 + e))),
            f = e * a;
        this.c = 2 * e * a;
        this.e = e;
        this.ellipse = ellipse(f, a, b);
        this.object = new THREE.Object3D();
        this.rMin = a * (1 - e);
        this.rMax = a * (1 + e);
        this.period = Math.sqrt(Math.pow(a / 300, 3));
        this.semiMajorAxis = a;
        this.semiMinorAxis = b;
        Object.defineProperties(this, {
            polar: {
                get: function () {
                    return this.semiMajorAxis * (1 - Math.pow(this.e, 2)) / (1 + this.e * Math.cos(this.radian));
                }
            },
            r: {
                get: function () {
                    return this.values.r;
                }
            },
            radian: {
                get: function () {
                    return this.values.radian;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.values.radian = value;
                }
            },
            values: {
                value: {
                    r: 1,
                    radian: radian(Math.random() * 360) * (Math.PI / 180),
                    velocity: 1
                }
            },
            velocity: {
                get: function () {
                    return this.values.velocity;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value) && value > 0)
                        this.values.velocity = value;
                }
            }
        });
        this.object.add(this.ellipse);
    }
    Orbit.prototype.rotate = function (theta) {
        this.object.rotation.y = radian(theta % 360);
        return this;
    };
    Orbit.prototype.setDynamics = function (v, r) {
        this.velocity = v;
        this.r = r;
        return this;
    };


    function Celestial () {
        this.object = new THREE.Object3D();
        this.uuid = uuid();
        Object.defineProperties(this, {
            polar: {
                get: function () {
                    return this.values.semiMajorAxis * (1 - Math.pow(this.values.e, 2)) / (1 + this.values.e * Math.cos(this.values.radian));
                }
            },
            r: {
                get: function () {
                    return this.values.radian * this.values.r;
                }
            },
            // r: { old
            //     get: function () {
            //         return Math.acos(this.x / Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.z, 2))) * Math.sign(this.z) * this.values.r;
            //     }
            // },
            rotation: {
                get: function () {
                    return this.mesh.rotation.y;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.mesh.rotation.y = value;
                }
            },
            prime: {
                get: function () {
                    return OBJECTS.get(this.store.primeUuid);
                },
                set: function (value) {
                    if (value instanceof Celestial) {
                        if (this.store.primeUuid)
                            this.prime.remove(this);
                        this.store.primeUuid = value.uuid;
                    }
                    return value;
                }
            },
            store: {
                value: {}
            },
            values: {
                value: {
                    e: 0,
                    r: -1,
                    R: 0,
                    semiMajorAxis: 0,
                    theta: 0,
                    velocity: 0
                }
            },
            x: {
                get: function () {
                    return this.object.position.x;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.object.position.x = value;
                }
            },
            y: {
                get: function () {
                    return this.object.position.y;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.object.position.y = value;
                }
            },
            z: {
                get: function () {
                    return this.object.position.z;
                },
                set: function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        this.object.position.z = value;
                }
            }
        });
        OBJECTS.add(this);
    };
    Celestial.prototype.setMesh = function (mesh) {
        var g = new THREE.Geometry();
        if (mesh instanceof THREE.Mesh) {
            this.mesh = mesh;
            this.object.add(mesh);
            g.vertices.push(new THREE.Vector3(0, 0, 0));
            g.vertices.push(new THREE.Vector3(100, 0, 0));
            this.mesh.add(new THREE.Line(g, new THREE.LineBasicMaterial({color: 0xffffff})));
        }
        return this;
    }
    // Celestial.prototype.setOrbit = function (a, b, theta, v, r) {
    //     var e = a !== b ? Math.sqrt(1 - (Math.pow(b, 2) / Math.pow(a, 2))) : 0;
    //     console.log(this);
    //     Object.assign(this.values, {
    //         d: Math.sqrt(Math.pow(a, 3)),
    //         e: e,
    //         F: e * a,
    //         r: r ? r * -1 : -1,
    //         R: 2 * e * a,
    //         semiMajorAxis: a,
    //         semiMinorAxis: b,
    //         theta: theta,
    //         velocity: v ? v : 1
    //     });
    //     loop.add(this.update.bind(this));
    //     return this;
    // };
    // Celestial.prototype.setOrbit = function (a, e, theta, v, r) {
    //     var b = Math.sqrt((a * (1 - e)) * (a * (1 + e)));
    //     Object.assign(this.values, {
    //         d: Math.sqrt(Math.pow(a, 3)),
    //         e: e,
    //         F: e * a,
    //         r: r ? r * -1 : -1,
    //         R: 2 * e * a,
    //         semiMajorAxis: a,
    //         semiMinorAxis: b,
    //         theta: theta,
    //         velocity: v ? v : 1
    //     });
    //     loop.add(this.update.bind(this));
    //     return this;
    // }
    Celestial.prototype.setOrbit = function (a, e, theta, v, r) {
        var b = Math.sqrt((a * (1 - e)) * (a * (1 + e)));
        this.orbit = new THREE.Object3D();
        Object.assign(this.values, {
            c: 2 * e * a,
            e: e,
            focus: e * a,
            period: Math.sqrt(Math.pow(a / AU, 3)),
            r: r ? r * -1 : -1,
            radian: this instanceof Star ? 0 : radian(Math.random() * 360),
            semiMajorAxis: a,
            semiMinorAxis: b,
            velocity: v ? v : 1
        });
        this.orbit.rotation.y = radian(theta % 360);
        this.orbit.add(this.object);
        this.orbit.add(ellipse(e * a, a, b));
        return this;
    };
    Celestial.prototype.update = function (radians) {
        this.values.radian += radians * this.values.velocity;
        this.x = this.polar * Math.cos(this.values.radian) + this.values.c;
        this.z = this.polar * Math.sin(this.values.radian);
        this.rotation = this.r;
        return this;
    };

    function Satellite (seed) {
        Celestial.call(this);
        this.class = 0;
        this.radius = 2;
        this.mass = 10;
        this.seed = seed;
    }
    Satellite.prototype = Object.create(Celestial.prototype);
    Satellite.prototype.constructor = Satellite;


    function Planet (seed) {
        Celestial.call(this);
        this.class = parse([
            Math.round((200 * system.iron) - 10),
            Math.round((500 * system.iron) - 30),
            Math.round((300 * system.iron) + 30)
        ], seed.parseSetRatio(0));
        this.radius = round(seed.parseSetRatio(1) * (this.class !== 3 ? 2 : 4) + (3 * this.class + 2));
        this.mass = round(seed.parseSetRatio(2) + (this.class > 1 ? 4.5 : 4 - this.class) * volume(this.radius) / 10000);
        this.satellites = new Collection();
        this.seed = seed;
    }
    Planet.prototype = Object.create(Celestial.prototype);
    Planet.prototype.constructor = Planet;
    Planet.prototype.addSatellite = function (satellite, label) {
        if (!satellite.prime && satellite instanceof Satellite) {
            satellite.prime = this;
            this.satellites.add(satellite);
            this.object.add(satellite.object);
            Object.defineProperty(this, label, {
                get: function () {
                    return OBJECTS.get(this[label + 'Uuid']);
                }
            });
            Object.defineProperty(this.store, label + 'Uuid', {
                value: satellite.uuid
            });
        }
        return this;
    };


    function Star (seed) {
        Celestial.call(this);
        this.planets = new Collection();
        if (seed.parse(0) > 7)
            (function (star, s) {
                var i, j, p;
                for (i = 0, j = (s.parse(1) % 2) + 1; i < j; i++) {
                    p = new Planet(new Seed4(SEED.getSet(10 + i, 4)));
                    p.prime = star;
                    star.planets.add(p);
                    // star.object.add(p.object);
                }
            } (this, seed));
    }
    Star.prototype = Object.create(Celestial.prototype);
    Star.prototype.constructor = Star;
    // Star.prototype.update = function (radians) {
    //     this.theta += radians * this.velocity;
    //     this.x = this.polar * Math.cos(this.theta) + this.R;
    //     this.z = this.polar * Math.sin(this.theta);
    //     this.rotation = system.binary ? this.r : this.rotation + radians * this.values.r;
    //     return this;
    // }
    function Alpha (seed) {
        Star.call(this, seed);
        this.class = parse([
            Math.round(150 - (100 * system.hydrogen)),
            Math.round(175 - (100 * system.hydrogen)),
            Math.round(190 - (100 * system.hydrogen))
        ], seed.parseSetRatio(0));
        this.radius = round(seed.parseSetRatio(1) * 20 + (this.class ? 140 + (this.class - 1) * 20 : 40));
        this.mass = round((seed.parseSetRatio(2) * (system.hydrogen - 0.83) + 1.33) * volume(this.radius) / 10000);
        this.seed = seed;
    }
    Alpha.prototype = Object.create(Star.prototype);
    Alpha.prototype.constructor = Alpha;
    function Beta (seed) {
        Star.call(this, seed);
        this.class = parse([
            Math.round(130 - (50 * system.hydrogen)),
            Math.round(140 - (50 * system.hydrogen))
        ], seed.parseSetRatio(0));
        this.radius = round(seed.parseSetRatio(1) * 20 + (this.class ? 140 + (this.class - 1) * 20 : 40));
        this.mass = round((seed.parseSetRatio(2) * (system.hydrogen - 0.83) + 1.33) * volume(this.radius) / 10000);
        this.seed = seed;
    }
    Beta.prototype = Object.create(Star.prototype);
    Beta.prototype.constructor = Beta;

    
    function System () {
        this.age = round(SEED.parseSetRatio(0) * 12 + 1.8);
        this.binary = SEED.parse(1) > 3;
        // this.binary = false;
        this.hydrogen = round(SEED.parseSetRatio(1) * 0.2 + 0.9);
        this.iron = round(SEED.parseSetRatio(2) * 0.1 + 0.1);
        this.name = SEED.getSet(0);
        // this.objects = new Collection();
        // Object.defineProperty(this, 'store', {
        //     value: {}
        // });
    }
    System.prototype.addObject = function (object) {
        // if (object !== null) {
        //     object.primeUiid = null;
        //     this.objects.add(object);
        //     scene.add(object.object);
        //     Object.defineProperty(this, label, {
        //         get: function () {
        //             return OBJECTS.get(this.store[label + 'Uuid']);
        //         }
        //     });
        //     Object.defineProperty(this.store, label + 'Uuid', {
        //         value: object.uuid
        //     });
        // }
        object.primeUuid = null;
        scene.add(object.orbit);
        return this;
    };
    System.prototype.pause = function () {
        stop();
    };
    // System.prototype.toggleOrbits = function () {
    //     OBJECTS.each(function (object) {
    //         object.ellipse.visible = !object.ellipse.visible;
    //     });
    // };

    function age (star) {
        var i = star.class,
            v = i !== 3 ? 20 : 3,
            m = i !== 3 ? 240 : 6;
        if (i && this.age >= 10 - i) {
            star.radius = round(parseInt(star.store.seed.slice(1, 2), 16) / 255 * v + m, 2);
            star.class = i === 3 ? 5 : 4;
        }
        return star;
    }
    function uniary () {
        var last = 10,
            alpha = age(new Alpha(new Seed4(SEED.getSet(0, 4))));
        alpha.setOrbit(0, 0, 0, 0, 1);
        system.addObject(alpha);
        alpha.planets.each(function (cthonian, i) {
            last = cthonian.radius / 2 + last + (10 * i);
            cthonian.setOrbit(last + alpha.radius, round(SEED.parseRatio(10 + i) * 0.1), radian(Math.random() * 360), 3 - i, 1);
            alpha.orbit.add(cthonian.orbit);
        });
        // system.addObject(alpha.setOrbit(0, 0, 0, 0, 1), 'A');
        //  Set cthonic planet orbits
        // system.A.planets.each(function (cthonian, i) {
        //     last = cthonian.radius / 2 + last + (10 * i);
        //     cthonian.setOrbit(last + system.A.radius, round(SEED.parseRatio(10 + i) * 0.1), radian(Math.random() * 360), 3 - i, 1);
        //     system.A.orbit.object.add(cthonian.orbit.object);
        // });
    }
    function binary () {
        var s1, s2, a, b, last = 10;
        s1 = age(new Alpha(new Seed4(SEED.getSet(0, 4))));
        s2 = age(new Beta(new Seed4(SEED.getSet(4, 4))));
        a = round(s1.radius + s2.radius + SEED.parseSetRatio(0) * 150 + 50);
        b = round(a * (s2.mass / (s1.mass + s2.mass)), 2) * -1; // Barrycenter
        if (s1.mass >= s2.mass) {
            s1.setOrbit(b, round(SEED.parseRatio(9) * 0.01), 0, 0.5, 1);
            s2.setOrbit(a + b, round(SEED.parseRatio(4) * 0.01), 0, 0.5, 1);
        } else {
            s1.setOrbit(a + b, round(SEED.parseRatio(4) * 0.01), 0, 0.5, 1);
            s2.setOrbit(b, round(SEED.parseRatio(9) * 0.01), 0, 0.5, 1);
        }
        system.addObject(s1);
        system.addObject(s2);
        //  Set cthonic planet orbits
        s1.planets.each(function (cthonian, i) {
            last = cthonian.radius / 2 + last + (10 * i);
            cthonian.setOrbit(last + s1.radius, round(SEED.parseRatio(10 + i) * 0.01), radian(Math.random() * 360), 3 - i, 1);
            s1.orbit.add(cthonian.orbit);
        });
        s2.planets.each(function (cthonian, i) {
            last = cthonian.radius / 2 + last + (10 * i);
            cthonian.setOrbit(last + s2.radius, round(SEED.parseRatio(10 + i) * 0.01), radian(Math.random() * 360), 3 - i, 1);
            s2.orbit.add(cthonian.orbit);
        });
    }
    

    
    //  Initialization Functions  //
    function create () {
        var planet, moon;
        SEED = new Seed32(Seed32.create(32));
        system = new System();
        if (system.binary) {
            binary();
        } else {
            uniary();
        }
        // planet = new Planet(new Seed4(SEED.getSet(12, 4)));
        // system.addObject(planet.setOrbit(300, 0.5/*round(SEED.parseRatio(12) * 0.1)*/, radian(Math.random() * 360), 1, 10), 'a');
        // moon = new Satellite(new Seed4(SEED.getSet(20, 4)));
        // planet.addSatellite(moon.setOrbit(25, round(SEED.parseRatio(13) * 0.01), radian(Math.random() * 360), 10, 1), 'a1');
    }
    function build () {
        OBJECTS.each(function (object) {
            var u = v = Math.floor(object.radius / 20 + 6);
                g = new THREE.SphereGeometry(object.radius, u, v),
                c = object.class;
            object.setMesh(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
                color: 0xffffff,//COLORS[(parseInt(object.store.colorSeed, 16) % 4) + 4 * c],
                wireframe: true
            })));
            // object.ellipse = ellipse(object.values.F, object.values.semiMajorAxis, object.values.semiMinorAxis);
            // object.focus = focus(object.values.F);
            // if (object.store.primeUuid) {
            //     object.prime.object.add(object.ellipse);
            //     object.prime.object.add(object.focus[0]);
            //     object.prime.object.add(object.focus[1]);
            // } else {
            //     scene.add(object.ellipse);
            //     scene.add(object.focus[0]);
            //     scene.add(object.focus[1]);
            // }
            // object.orbit.object.add(object.object);
            // scene.add(object.orbit.object);
            loop.add(object.update.bind(object));
        });
        scene.add(ellipse(0, AU, AU)); // AU
    }
    function init () {
        var canvas = $('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width() / canvas.height(), 1, 20000);
        renderer = new THREE.WebGLRenderer();

        camera.position.set(1200, 1200, 1200);
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