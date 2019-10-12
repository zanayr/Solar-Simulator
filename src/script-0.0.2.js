var system,
    LOOP,
    scene,
    db,
    OBJECTS;
(function () {
    var _values = {au: 300, seed: null, speed: 0.01},
        camera,
        renderer;
        // scene;
    //  Auxillary Functions  //
    function barycenter (object1, object2, distance) {
        var a = round2(object1.radius + object2.radius + distance);
        return {
            a: a,
            b: round2(a * (object2.mass / (object1.mass + object2.mass))) * -1
        };
    }
    function probability (table, value) {
        var v = Math.round(100 * value),
            len,
            i;
        for (i = 0, len = table.length; i < len; i++)
            if (v <= table[i])
                return i;
        return len;
    }
    function round2 (value) {
        return Math.round(100 * value) / 100;
    }
    function toDegree (radian) {
        return radian / (Math.PI / 180);
    }
    function toRadian (degree) {
        return degree * (Math.PI / 180);
    }
    function volume (radius) {
        return (4 / 3) * Math.PI * Math.pow(radius, 3);
    }
    function uuid () {
        return ('xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    
    //  LOOP OBJECT  //
    //  Loop Functions  //
    function update (step) {
        var i, l;
        for (i = 0, l = LOOP.updates.length; i < l; i++)
            LOOP.updates[i](toRadian(step));
    }
    /*
    camera.position.applyQuaternion( new THREE.Quaternion().setFromAxisAngle
        new THREE.Vector3( 0, 1, 0 ), // The positive y-axis
        RADIAN / 1000 * delta // The amount of rotation to apply this time
    ));
    camera.lookAt( scene.position );
    */
    function render (step) {
        camera.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), toRadian(step)));
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }
    function main (timestamp) {
        var cycles = 0;
        if (LOOP.state) {
            //  Check if main has been called to early
            if (timestamp < LOOP.lastFt + LOOP.timestep) {
                LOOP.frameId = window.requestAnimationFrame(main);
                return;
            }
            LOOP.delta += timestamp - LOOP.lastFt;
            LOOP.lastFt = timestamp;
            //  Check if main was called to late
            if (timestamp > LOOP.lastFt + 1000) {
                LOOP.fps = 0.25 * LOOP.fts * 0.75 * LOOP.fps;
                LOOP.lastFps = timestamp;
                LOOP.fts = 0;
            }
            LOOP.fts++;
            //  Update Elements
            while (LOOP.delta >= LOOP.timestep) {
                update(360 / LOOP.timestep * _values.speed);
                LOOP.delta -= LOOP.timestep;
                cycles++;
                if (cycles >= 240) {
                    LOOP.delta = 0;
                    break;
                }
            }
            //  Render Elements
            render(360 / LOOP.timestep * 0.01);
            LOOP.framId = window.requestAnimationFrame(main);
            return;
        }
    }
    function start () {
        if (!LOOP.state) {
            LOOP.frameId = window.requestAnimationFrame(function (timestamp) {
                LOOP.state = 1;
                render(0.00037);
                LOOP.lastFt = timestamp;
                LOOP.lastFps = timestamp;
                LOOP.fts = 0;
                LOOP.frameId = window.requestAnimationFrame(main);
                return;
            });
        }
        return;
    }
    function stop () {
        LOOP.state = 0;
        window.cancelAnimationFrame(LOOP.frameId);
    }
    //  Loop  //
    function Loop (max) {
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
    Loop.prototype.add = function (update) {
        if (!this.state)
            this.updates.push(update);
    }


    //  STORE AND COLLECITON OBJECTS  //
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
        if (object.uuid && !this.uuids.includes(object.uuid)) {
            this.store[object.uuid] = object;
            return true;
        }
        return true;
    };
    Store.prototype.each = function (fn, args) {
        var i, l;
        for (i = 0, l = this.length; i < l; i++)
            if (typeof fn === 'function')
                fn.apply(null, [this.store[this.uuids[i]], i].concat(Array.isArray(args) ? args : []));
        return this;
    }
    Store.prototype.get = function (uuid) {
        if (this.uuids.includes(uuid))
            return this.store[uuid];
        return null;
    };
    //  Collection  //
    function Collection () {
        Object.defineProperties(this, {
            collection: {
                value: [],
                writable: true
            },
            length: {
                get: function () {
                    return this.collection.length;
                }
            },
            uuids: {
                get: function () {
                    return this.collection.slice();
                }
            }
        });
    }
    Collection.prototype.add = function (item) {
        if (!this.uuids.includes(item.uuid))
            this.collection = this.collection.concat(item.uuid);
        return this;
    };
    Collection.prototype.each = function (fn, args) {
        var i, l;
        for (i = 0, l = this.length; i < l; i++)
            if (typeof fn === 'function')
                fn.apply(null, [OBJECTS.get(this.collection[i]), i].concat(Array.isArray(args) ? args : []));
        return this;
    };
    Collection.prototype.get = function (uuid) {
        if (this.uuids.includes(uuid))
            return OBJECTS.get(uuid);
        return null;
    };


    //  THREE OBJECTS  //
    //  Line  //
    function Line (a, b) {
        var geometry = new THREE.Geometry();
        geometry.vertices.push(a);
        geometry.vertices.push(b);
        this.line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: 0xffffff}));
    }
    //  Ellipse  //
    function Ellipse (x, a, b) {
        var curve = new THREE.EllipseCurve(x, 0, a, b, 0, 2 * Math.PI, false, 0),
            points = curve.getPoints(Math.abs(Math.floor(a))),
            geometry = new THREE.Geometry(),
            i;
        for (i in points)
            geometry.vertices.push(new THREE.Vector3(points[i].x, 0, points[i].y));
        this.curve = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: 0xffffff}));
    }
    

    //  APP OBJECTS  //
    //  Seed  //
    function Seed (value) {
        Object.defineProperties(this, {
            length: {
                get: function () {
                    return this.value.length;
                }
            },
            value: {
                value: (function () {
                    return value.replace(/\s/g, '').replace(/[\da-z]/ig, function (ch) {
                        return (ch.charCodeAt(0) % 16).toString(16);
                    });
                }())
            }
        });
    }
    Seed.prototype.get = function (index) {
        return this.value[index % 32];
    };
    Seed.prototype.getSet = function (index, count) {
        var l = count && isFinite(count) ? count : 2;
        if (index + l >= this.length)
            return this.value.slice(index, this.length) + this.getSet(0, index + l - this.length);
        return this.value.slice(index, index + l);
    };
    Seed.prototype.parse = function (index) {
        return parseInt(this.get(index), 16);
    };
    Seed.prototype.parseSet = function (index, count) {
        return parseInt(this.getSet(index, count), 16);
    };
    Seed.prototype.ratio = function (index) {
        return this.parseSet(index, 2) / 255;
    };
    Seed.prototype.createFrom = function (index, count) {
        return new Seed(this.getSet(index, count));
    };
    Seed.create = function (value, length) {
        return (value.padStart(length, 'x')).replace(/x/g, function () {
            return String.fromCharCode(Math.round(Math.random() * 25) + (Math.random() > 0.5 ? 97 : 65));
        });
    };


    //  Orbit Ellipse  //
    function OrbitEllipse (x, major, minor) {
        this.curve = new Ellipse(x, major, minor).curve;
        this.focus = [[
            new Line(new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)).line,
            new Line(new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, 5)).line
        ], [
            new Line(new THREE.Vector3(2 * x - 5, 0, 0), new THREE.Vector3(2 * x + 5, 0, 0)).line,
            new Line(new THREE.Vector3(2 * x, 0, -5), new THREE.Vector3(2 * x, 0, 5)).line,
        ]];
    }


    //  Orbit  //
    function OrbitII (object, r, ecc, theta) {
        var a = r && isFinite(r) ? r : 0,
            e = ecc && isFinite(ecc) ? ecc : 0,
            b = Math.sqrt((a *(1 - e)) * (a * (1 - e)));
        Object.defineProperties(this, {
            ellipse: {
                value: new OrbitEllipse(a * e, a, b).curve
            },
            focus: {
                value: [
                    new Line(new THREE.Vector3(-5, 0, 0), new THREE.Vector(5, 0, 0)).line,
                    new Line(new THREE.Vector3(a * e - 5, 0, 0), new THREE.Vector3(a * e + 5, 0, 0)).line
                ]
            },
            objects: {
                value: new Collection()
            },
            values: {
                value: {
                    d: 2 * e * a,
                    e: e,
                    origin: {x: e * a, z: 0},
                    period: Math.sqrt(Math.pow(a / _values.au, 3)),
                    rotation: toRadian(theta),
                    semiMajorAxis: a,
                    semiMinorAxis: b
                }
            }
        });
    }
    OrbitII.prototype.addObject = function (object) {
        if (object instanceof Celestial) {
            this.objects.add(object);
            object.setOrbit(this);
        }
        return this;
    }



    function Orbit (r, ecc, theta, iota) {
        var a = r && isFinite(r) ? r : 0,
            e = ecc && isFinite(ecc) ? ecc : 0,
            b = Math.sqrt((a * (1 - e)) * (a * (1 + e)));
        Object.defineProperties(this, {
            ellipse: {
                value: []
            },
            focus: {
                value: []
            },
            object3d: {
                value: new THREE.Object3D()
            },
            objects: {
                value: new Collection()
            },
            polar: {
                get: function () {
                    return this.values.semiMajorAxis * (1 - Math.pow(this.values.e, 2)) / (1 - this.values.e * Math.cos(this.values.current));
                }
            },
            values: {
                value: {
                    current: iota && isFinite(iota) ? toRadian(iota % 360) : 0,
                    d: 2 * e * a,
                    e: e,
                    origin: {x: e * a, z: 0},
                    period: Math.sqrt(Math.pow(a / _values.au, 3)),
                    semiMajorAxis: a,
                    semiMinorAxis: b,
                    velocity: 1
                }
            },
            uuid: {
                value: uuid()
            },
            x: {
                get: function () {
                    return this.object3d.position.x;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.object3d.position.x = value;
                }
            },
            y: {
                get: function () {
                    return this.object3d.position.y;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.object3d.position.y = value;
                }
            },
            z: {
                get: function () {
                    return this.object3d.position.z;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.object3d.position.z = value;
                }
            }
        });
        this.object3d.rotation.y = theta && isFinite(theta) ? toRadian(theta % 360) : 0;
        ORBITS.add(this);
    }
    Orbit.prototype.addObject = function (object) {
        this.objects.add(object);
        this.object3d.add(object.object3d);
        object.orbit = this;
        return this;
    };
    Orbit.prototype.addEllipse = function (values) {
        console.log(values);
        var e = new OrbitEllipse(values.origin.x, values.semiMajorAxis, values.semiMinorAxis);
        this.ellipse.push(e.curve);
        this.focus.push(e.focus);
        this.object3d.add(e.curve);
        this.object3d.add(e.focus[0][0]);
        this.object3d.add(e.focus[0][1]);
        this.object3d.add(e.focus[1][0]);
        this.object3d.add(e.focus[1][1]);
        return this;
    };
    Orbit.prototype.setDynamics = function (v) {
        Object.assign(this.values, {velocity: v && isFinite(v) ? v : 1});
        return this;
    };
    Orbit.prototype.update = function (radian) {
        this.values.current += radian * this.values.velocity;
        this.x = this.polar * Math.cos(this.values.current);
        this.z = this.polar * Math.sin(this.values.current);
        return this;
    };


    //  System  //
    function System () {
        this.age = round2(_values.seed.ratio(0) * 12 + 1.8);
        this.hydrogen = round2(_values.seed.ratio(1) * 0.2 + 0.9);
        this.center = new Orbit(0, 0, 0, 0);
        this.iron = round2(_values.seed.ratio(2) * 0.1 + 0.1);
        this.density = round2(_values.seed.ratio(3) * (this.hydrogen - 0.83) + 1.33);
        this.name = _values.seed.getSet(0, 4);
        Object.defineProperties(this, {
            store: {
                value: {}
            }
        });
        scene.add(this.center.object3d);
    }
    System.prototype.addEllipse = function (values) {
        this.center.addEllipse(values);
        return this;
    };
    System.prototype.addObject = function (object) {
        this.center.addObject(object);
        return this;
    };
    System.prototype.pause = function () {
        stop();
        return this;
    };
    System.prototype.setLabel = function (object, label) {
        if (object instanceof Celestial) {
            Object.defineProperty(this, label, {
                get: function () {
                    return OBJECTS.get(this.store[label + 'Uuid']);
                }
            });
            Object.defineProperty(this.store, label + 'Uuid', {
                value: object.uuid
            });
        }
        return this;
    };
    System.prototype.toggleOrbits = function () {
        ORBITS.each(function (orbit) {
            if (orbit.ellipse) {
                orbit.ellipse.forEach(function (ellipse) {
                    ellipse.visible = !ellipse.visible;
                });
                orbit.focus.forEach(function (focus) {
                    focus.forEach(function (foci) {
                        foci[0].visible = !foci[0].visible;
                        foci[1].visible = !foci[1].visible;
                    });
                });
            }
        });
        return this;
    };


    //  Celestial  //
    function Celestial () {
        Object.defineProperties(this, {
            object3d: {
                value: new THREE.Object3D()
            },
            polar: {
                get: function () {
                    return this.values.semiMajorAxis * (1 - Math.pow(this.values.e, 2)) / (1 - this.values.e * Math.cos(this.values.current));
                }
            },
            r: {
                get: function () {
                    return this.values.current * this.values.r;
                }
            },
            rotation: {
                get: function () {
                    return this.mesh.rotation.y;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.mesh.rotation.y = value;
                    return value;
                }
            },
            uuid: {
                value: uuid()
            },
            values: {
                value: {
                    current: 0,
                    d: 0,
                    e: 0,
                    origin: {x: 0, z: 0},
                    period: 0,
                    r: 0,
                    semiMajorAxis: 0,
                    semiMinorAxis: 0,
                    velocity: 1,
                    iota: 45 * (Math.PI / 180)
                }
            },
            x: {
                get: function () {
                    return this.object3d.position.x;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.object3d.position.x = value;
                    return value;
                }
            },
            y: {
                get: function () {
                    return this.object3d.position.y;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.object3d.position.y = value;
                    return value;
                }
            },
            z: {
                get: function () {
                    return this.object3d.position.z;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.object3d.position.z = value;
                    return value;
                }
            }
        });
        OBJECTS.add(this);
    }
    Celestial.prototype.setDynamics = function (r, v, iota) {
        Object.assign(this.values, {
            current: iota && isFinite(iota) ? toRadian(iota % 360) : 0,
            velocity: v && isFinite(v) ? v : 1,
            r: r && isFinite(r) ? r * -1 : -1
        });
        return this;
    };
    Celestial.prototype.setOrbit = function (r, ecc) {
        var a = r && isFinite(r) ? r : 0,
            e = ecc && isFinite(ecc) ? ecc : 0,
            b = Math.sqrt((a * (1 - e)) * (a * (1 + e)));
        Object.assign(this.values, {
            current: 0,
            d: 2 * e * a,
            e: e,
            origin: {x: e * a, z: 0},
            period: Math.sqrt(Math.pow(a / _values.au, 3)),
            semiMajorAxis: a,
            semiMinorAxis: b,
            velocity: 1,
            r: -1
        });
        return this;
    };
    Celestial.prototype.update = function (radian) {
        var x, y;
        this.values.current += radian * this.values.velocity;
        x = this.polar * Math.cos(this.values.current);
        y = this.polar * Math.sin(this.values.current);
        this.x = x * Math.cos(this.values.iota) + y * Math.sin(this.values.iota);
        this.z = (x * -1) * Math.sin(this.values.iota) + y * Math.cos(this.values.iota);
        this.rotation = this.r;
        return this;
    };

    
    //  Star  //
    function Star (seed) {
        Celestial.call(this);
        this.class = probability([
            Math.round(150 - (100 * system.hydrogen)),
            Math.round(175 - (100 * system.hydrogen)),
            Math.round(190 - (100 * system.hydrogen))
        ], seed.ratio(0));
        this.radius = round2(seed.ratio(1) * 20 + (this.class ? 140 + (this.class - 1) * 20 : 40));
        this.mass = round2(system.density * volume(this.radius) / 10000);
        this.seed = seed;
    }
    Star.prototype = Object.create(Celestial.prototype);
    Star.prototype.constructor = Star;
    Star.prototype.age = function () {
        var v = this.class !== 3 ? 20 : 3,
            m = this.class !== 3 ? 240 : 6;
        if (this.class && system.age >= 10 - this.class) {
            this.radius = round2(this.seed.ratio(1) * v + m);
            this.class = this.class === 3 ? 5 : 4;
        }
        return this;
    };

    function Planet (seed) {
        Celestial.call(this);
        this.class = probability([
            Math.round((200 * system.iron) - 10),
            Math.round((500 * system.iron) - 30),
            Math.round((300 * system.iron) + 30)
        ], seed.ratio(0));
        this.radius = round2(seed.ratio(1) * (this.class !== 3 ? 2 : 4) + (3 * this.class + 2));
        this.mass = round2(seed.ratio(2) + (this.class > 1 ? 4.5 : 4 - this.class) * volume(this.radius) / 10000);
        this.seed = seed;
    }
    Planet.prototype = Object.create(Celestial.prototype);
    Planet.prototype.constructor = Planet;


    


    //  Creation Functions  //
    function stars () {
        var s1, s2, bc, orbit;
        s1 = new Star(_values.seed.createFrom(4, 4));
        // orbit = new Orbit(0, 0, 0, 0);
        if (_values.seed.ratio(0) >= 0.4) {
            s2 = new Star(_values.seed.createFrom(8, 4));
            system.setLabel(s1.mass >= s2.mass ? s1 : s2, 'A');
            system.setLabel(system.A.uuid === s1.uuid ? s2 : s1, 'B');
            system.A.age();
            system.B.age();
            bc = barycenter(system.A, system.B, _values.seed.ratio(1) * 150 + 50);
            system.A.setOrbit(bc.b, _values.seed.ratio(6) * 0.1)
                .setDynamics(1, 1, 0);
            system.B.setOrbit(bc.a + bc.b, _values.seed.ratio(10) * 0.1)
                .setDynamics(1, 1, 0);
            system.addObject(system.A)
                .addEllipse(system.A.values);
            system.addObject(system.B)
                .addEllipse(system.B.values);
        } else {
            system.setLabel(s1, 'A');
            system.A.age()
                .setOrbit(0, _values.seed.ratio(6) * 0.1)
                .setDynamics(1, 1, 0);
            system.addObject(system.A);
        }
    }
    function planets () {
        var planet;
        planet = new Planet(_values.seed.createFrom(12, 4));
        orbit = new Orbit(300, 0.25, 0, 0, true);
        system.setLabel(planet, 'a');
        system.a.setOrbit(0, 0)
            .setDynamics(1, 1, 0);
        orbit.addObject(system.a)
            .setDynamics(3);
        system.addObject(orbit)
            .addEllipse(orbit.values, scene);
    }
    function OrbitII (object, r, ecc, theta, iota) {
        
    }
    function planetsII () {
        var orbit = new OrbitII(null, 300, 0.25, 0, 0),
            planet = new Planet(_values.seed.createFrom(12, 4));
        orbit.addObject(planet); // Should automatically create an ellipse, and the object's values are pared to that orbit
        planet.setDynamics(1, 1);
        system.setLabel(planet, 'a');
    } 


    //  App Functions  //
    function create () {
        _values.seed = new Seed(Seed.create('', 32));
        system = new System();
        //  Create Stars
        stars();
        // planets();
    }
    function build () {
        ORBITS.each(function (orbit) {
            LOOP.add(orbit.update.bind(orbit));
        });
        OBJECTS.each(function (object) {
            var u, v, geometry;
            u = v = Math.floor(object.radius / 20 + 6);
            geometry = new THREE.SphereGeometry(object.radius, u, v);
            object.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true}));
            object.mesh.add(new Line(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-100 * Math.sign(object.values.semiMajorAxis), 0, 0)).line);
            object.object3d.add(object.mesh);
            LOOP.add(object.update.bind(object));
        });
    }
    function debug () {
        var b = Math.sqrt((300 * (1 - 0.5)) * (300 * (1 + 0.5))),
            el = new OrbitEllipse(150, 300, b);
        scene.add(el.curve);
        scene.add(el.focus[0][0]);
        scene.add(el.focus[0][1]);
        scene.add(el.focus[1][0]);
        scene.add(el.focus[1][1]);
        return {
            a: 300,
            b: b,
            e: 0.25,
            el: el
        }
    }
    function init () {
        var canvas = $('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width() / canvas.height(), 1, 20000);
        renderer = new THREE.WebGLRenderer();

        camera.position.set(0, 2000, 0);
        camera.lookAt(scene.position);

        renderer.setSize(canvas.width(), canvas.height());
        renderer.setClearColor(0x000000, 1);

        canvas.append(renderer.domElement);
        
        LOOP = new Loop(60);
        OBJECTS = new Store();
        ORBITS = new Store();
        //  Mark Origin (for debugging)
        scene.add(new Line(new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)).line);
        scene.add(new Line(new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, 5)).line);
        create();
        build();
        // db = debug();
        start();
    }
    init();
}());