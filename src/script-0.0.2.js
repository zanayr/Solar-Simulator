var system,
    LOOP,
    scene,
    OBJECTS;
(function () {
    var _values = {au: 300, min: 200, seed: null, speed: 0.01},
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
            // LOOP.updates[i](toRadian(step));
    }
    /*
    camera.position.applyQuaternion( new THREE.Quaternion().setFromAxisAngle
        new THREE.Vector3( 0, 1, 0 ), // The positive y-axis
        RADIAN / 1000 * delta // The amount of rotation to apply this time
    ));
    camera.lookAt( scene.position );
    */
    function render (step) {
        // camera.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), toRadian(step)));
        // camera.lookAt(scene.position);
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
    function OrbitEllipse (x, major, minor, theta) {
        this.bifercator = new Line(new THREE.Vector3(major * -1, 0, 0), new THREE.Vector3(major, 0, 0)).line;
        this.curve = new Ellipse(x, major, minor).curve;
        this.focus = [[
            new Line(new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)).line,
            new Line(new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, 5)).line
        ], [
            new Line(new THREE.Vector3((2 * x - 5) * Math.cos(theta), 0, (2 * x - 5) * Math.sin(theta)), new THREE.Vector3((2 * x + 5) * Math.cos(theta), 0, (2 * x + 5) * Math.sin(theta))).line,
            new Line(new THREE.Vector3(2 * x * Math.cos(theta), 0, 2 * x * Math.sin(theta) - 5), new THREE.Vector3(2 * x * Math.cos(theta), 0, 2 * x * Math.sin(theta) - 5)).line,,
        ]];
    }
    //  Orbit  //
    function Orbit (r, ecc, theta, phi) {
        var a = typeof r === 'number' && isFinite(r) ? r : 0,
            e = typeof ecc === 'number' && isFinite(ecc) && (ecc >= 0 && ecc <= 1) ? ecc : 0,
            b = Math.sqrt((a * (1 - e)) * (a * (1 + e)));
        Object.defineProperties(this, {
            r: {
                get: function () {
                    return this.values.semiLatusRectum / (1 - this.values.e * Math.cos(this.values.theta));
                }
            },
            ellipses: {
                value: []
            },
            uuid: {
                value: uuid()
            },
            values: {
                value: {
                    d: Math.abs(a) + Math.abs(a) * e,
                    e: e,
                    period: Math.sqrt(Math.pow(a / _values.au, 3)),
                    phi: toRadian(phi % 360),
                    semiLatusRectum: a * (1 - Math.pow(e, 2)),
                    semiMajorAxis: a,
                    semiMinorAxis: b,
                    theta: toRadian(theta % 360),
                    velocity: 1
                }
            },
            x: {
                get: function () {
                    return this.r * Math.cos(this.values.theta - this.values.phi); //+ this.values.e * this.values.semiMajorAxis;
                }
            },
            z: {
                get: function () {
                    return this.r * Math.sin(this.values.theta - this.values.phi);
                }
            }
        });
        (function () {
            var el = new OrbitEllipse(e * a, a, b);
            scene.add(el.curve);
            // el.focus.forEach(function (f) {
            //     scene.add(f[0]);
            //     scene.add(f[1]);
            // });
            el.curve.rotation.y = toRadian(phi % 360);
        }());
        ORBITS.add(this);
    }
    Orbit.prototype.addObject = function (object) {
        var u;
        if (object instanceof Celestial || object instanceof Ring) {
            u = this.uuid;
            Object.defineProperty(object.store, 'orbitUuid', {
                value: u
            });
            Object.defineProperty(object, 'orbit', {
                get: function () {
                    return ORBITS.get(object.store.orbitUuid);
                }
            });
            object.line = new Line(new THREE.Vector3(0, 0, 0), new THREE.Vector3(object.radius + 25, 0, 0)).line;
        }
        return this;
    };
    Orbit.prototype.setVelocity = function (velocity) {
        Object.assign(this.values, {velocity: velocity && isFinite(velocity) ? velocity : 1});
        return this;
    };
    Orbit.prototype.update = function (radian) {
        var i, l;
        this.values.theta += radian * this.values.velocity;
        for (i = 0, l = this.ellipses.length; i < l; i++)
            this.ellipses[i].curve.position.set(this.x, 0, this.z);
        return this;
    };
    //  System  //
    function System () {
        this.age = round2(_values.seed.ratio(0) * 12 + 1.8);
        // this.age = 10;
        this.binary = _values.seed.ratio(1) >= 0.4;
        this.hydrogen = round2(_values.seed.ratio(2) * 0.2 + 0.9);
        this.iron = round2(_values.seed.ratio(3) * 0.1 + 0.1);
        this.density = round2(_values.seed.ratio(4) * (this.hydrogen - 0.83) + 1.33);
        this.name = _values.seed.getSet(0, 5);
        Object.defineProperties(this, {
            store: {
                value: {}
            }
        });
    }
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
            r: {
                get: function () {
                    return this.values.semiLatusRectum / (1 - this.values.e * Math.cos(this.values.theta));
                }
            },
            rotation: {
                get: function () {
                    return this.mesh.rotation.y;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.mesh.rotation.y = value;
                }
            },
            store: {
                value: {}
            },
            uuid: {
                value: uuid()
            },
            values: {
                value: {
                    semiLatusRectum: 0,
                    semiMajorAxis: 0,
                    e: 0,
                    theta: 0,
                    phi: 0,
                    rotation: 1,
                    velocity: 1
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
    Celestial.prototype.setDynamics = function (rotation, velocity) {
        if (this.orbit instanceof Orbit) {
            Object.assign(this.values, {
                rotation: rotation && isFinite(rotation) ? rotation : 1,
                velocity: velocity && isFinite(velocity) ? velocity : 1
            });
        }
        return this;
    };
    Celestial.prototype.setMesh = function (radius, color) {
        var u, v, geometry;
        u = v = Math.round(radius / 20 + 6);
        geometry = new THREE.SphereGeometry(radius, u, v);
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: color, wireframe: true}));
        this.object3d.add(this.mesh);
        //  for debugging
        if (this.line)
            this.mesh.add(this.line);
        return this;
    };
    Celestial.prototype.setOrbit = function (a, ecc, theta, phi) {
        var e, p;
        if (this.orbit instanceof Orbit) {
            p = this.orbit.values.phi;
            Object.assign(this.values, {
                e: ecc && isFinite(ecc) ? ecc : 0,
                phi: phi && isFinite(phi) ? toRadian(phi % 360) + p : p,
                semiLatusRectum: a * (1 - Math.pow(ecc, 2)),
                semiMajorAxis: a && isFinite(a) ? a : 0,
                theta: theta && isFinite(theta) ? toRadian(theta % 360) : 0,
            });
            e = new OrbitEllipse(ecc * a, a, Math.sqrt((a * (1 - ecc)) * (a * (1 + ecc))));
            this.orbit.ellipses.push(e);
            scene.add(e.curve);
            // el.focus.forEach(function (f) {
            //     scene.add(f[0]);
            //     scene.add(f[1]);
            // });
            e.curve.rotation.y = this.values.phi;
        }
        return this;
    };
    Celestial.prototype.update = function (radian) {
        this.values.theta += radian * this.values.velocity;
        this.x = this.r * Math.cos(this.values.theta - this.values.phi) + this.orbit.x;
        this.z = this.r * Math.sin(this.values.theta - this.values.phi) + this.orbit.z;
        this.rotation = this.values.rotation * (this.r ? this.values.theta : this.orbit.values.theta) * -1;
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
        // this.class = 2;
        this.radius = round2(seed.ratio(1) * 20 + (this.class ? 140 + (this.class - 1) * 20 : 40));
        this.mass = round2(system.density * volume(this.radius) / 10000);
        this.seed = seed;
        scene.add(this.object3d);
    }
    Star.prototype = Object.create(Celestial.prototype);
    Star.prototype.constructor = Star;
    Star.prototype.age = function () {
        var v = this.class !== 3 ? 20 : 3,
            m = this.class !== 3 ? 240 : 6;
        if (this.class && system.age >= 10 - this.class) {
            this.radius = round2(this.seed.ratio(1) * v + m);
            this.class = this.class !== 3 ? 4 : 5;
        }
        return this;
    };
    //  Planet  //
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
    function Satellite (seed, prime) {
        Celestial.call(this);
        this.class = probability([prime.radius <= 7 ? 50 : 90], seed.ratio(0)); // 2 classes natural or captured
        if (prime.radius <= 7) {
            this.radius = round2(seed.ratio(1) * (0.5 * prime.radius) + 0.5);
        } else {
            this.radius = round2(seed.ratio(1) * 4 + 1);
        }
        this.mass = round2(seed.ratio(2) + (this.class > 1 ? 4.5 : 4 - this.class) * volume(this.radius) / 10000);
        this.seed = seed;
    }
    Satellite.prototype = Object.create(Celestial.prototype);
    Satellite.prototype.constructor = Satellite;

    function Ring (seed, inner) {
        this.class = 0;
        this.innerRadius = inner;
        this.outerRadius = round2(seed.ratio(0) * 5) + 5
        this.seed = seed;
        Object.defineProperties(this, {
            object3d: {
                value: new THREE.Object3D()
            },
            r: {
                value: 0
            },
            rotation: {
                get: function () {
                    return this.mesh.rotation.y;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.mesh.rotation.z = value;
                }
            },
            store: {
                value: {}
            },
            uuid: {
                value: uuid()
            },
            values: {
                value: {
                    semiLatusRectum: 0,
                    semiMajorAxis: 0,
                    e: 0,
                    theta: 0,
                    phi: 0,
                    rotation: 1,
                    velocity: 1
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
    Ring.prototype.setDynamics = function (rotation, velocity) {
        if (this.orbit instanceof Orbit) {
            Object.assign(this.values, {
                rotation: rotation && isFinite(rotation) ? rotation : 1,
                velocity: velocity && isFinite(velocity) ? velocity : 1
            });
        }
        return this;
    };
    Ring.prototype.setMesh = function (inner, outer, color) {
        var u, geometry;
        u = Math.round(outer / 20 + 6);
        geometry = new THREE.RingGeometry(inner, outer, u);
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: color, wireframe: true}));
        this.mesh.rotation.x = Math.PI / 2;
        this.object3d.add(this.mesh);
        return this;
    };
    Ring.prototype.setOrbit = function (a, ecc, theta, phi) {
        var e, p;
        if (this.orbit instanceof Orbit) {
            p = this.orbit.values.phi;
            Object.assign(this.values, {
                e: ecc && isFinite(ecc) ? ecc : 0,
                phi: phi && isFinite(phi) ? toRadian(phi % 360) + p : p,
                semiLatusRectum: a * (1 - Math.pow(ecc, 2)),
                semiMajorAxis: a && isFinite(a) ? a : 0,
                theta: theta && isFinite(theta) ? toRadian(theta % 360) : 0,
            });
            e = new OrbitEllipse(ecc * a, a, Math.sqrt((a * (1 - ecc)) * (a * (1 + ecc))));
            this.orbit.ellipses.push(e);
            scene.add(e.curve);
            e.curve.rotation.y = this.values.phi;
        }
        return this;
    };
    Ring.prototype.update = function (radian) {
        this.values.theta += radian * this.values.velocity;
        this.x = this.r * Math.cos(this.values.theta - this.values.phi) + this.orbit.x;
        this.z = this.r * Math.sin(this.values.theta - this.values.phi) + this.orbit.z;
        this.rotation = this.values.rotation * (this.r ? this.values.theta : this.orbit.values.theta) * -1;
        return this;
    };

    function cthonian (star, orbit) {
        var i, l, m, p, a, e;
        m = star.radius;
        for (i = 0, l = (star.seed.parse(1) % 2) + 1; i < l; i++) {
            p = new Planet(_values.seed.createFrom(10 + i, 4));
            a = round2(p.seed.ratio(0) * 10 + 10 + p.radius);
            e = round2(p.seed.ratio(1) * (0.2 - 1 / 10));
            orbit.addObject(p);
            p.setOrbit(a + m, e, 0, 0)
                .setDynamics(1, i ? 8 : 10);
            m += Math.abs(a) + Math.abs(a) * e;
        }
        return null;
    }
    function stars () {
        var s1, s2, bc, o1, o2;
        s1 = new Star(_values.seed.createFrom(4, 4));
        if (system.binary) {
            s2 = new Star(_values.seed.createFrom(8, 4));
            if (s1.mass >= s2.mass) {
                system.setLabel(s1, 'A')
                    .setLabel(s2, 'B');
            } else {
                system.setLabel(s2, 'A')
                    .setLabel(s1, 'B');
            }
            system.A.age();
            system.B.age();
            bc = barycenter(system.A, system.B, system.A.radius + system.B.radius + 100);
            o1 = new Orbit(bc.b, _values.seed.ratio(0) * 0.5, 0, 0)
                .addObject(system.A);
            o2 = new Orbit(bc.a + bc.b, _values.seed.ratio(1) * 0.5, 0, 0)
                .addObject(system.B);
            system.A.setDynamics(1, 1);
            system.B.setDynamics(1, 1);
            if (system.A.seed.parse(0) > 7)
                cthonian(system.A, o1);
            if (system.B.seed.parse(1) > 7)
                cthonian(system.B, o2);
            _values.min += system.A.orbit.values.d >= system.B.orbit.values.d ? system.A.orbit.values.d : system.B.orbit.values.d
        } else {
            system.setLabel(s1, 'A');
            system.A.age();
            o1 = new Orbit(0, 0, 0, 0)
                .addObject(system.A);
            system.A.setDynamics(1, 1);
            if (system.A.seed.parse(0) > 7)
                cthonian(system.A, o1);
            _values.min += system.A.radius;
        }
        return null;
    }
    function satellites (planet) {
        var moons = [],
            count,
            i,
            last = planet.radius + 10;
        if (planet.radius <= 5) {
            count = planet.seed.parse(3) % 2 + 1;
        } else if (planet.radius <= 7) {
            count = planet.seed.parse(3) % 3 + 1;
        } else {
            count = planet.seed.parse(3) % 4 + 4;
        }
        for (i = 0; i < count; i++)
            moons.push(new Satellite(_values.seed.createFrom(20 + i, 4), planet.radius));
        moons.forEach(function (moon, i) {
            var a = last + moon.radius,
                e = moon.class ? moon.seed.ratio(0) * 0.2 + 0.1 : moon.seed.ratio(0) * 0.1;
            planet.orbit.addObject(moon);
            moon.setOrbit(a, e, Math.random() * 360, 0)
                .setDynamics(a < planet.radius * 8 ? 1 * Math.sign(planet.values.rotation) : moon.radius * 1.8 * Math.sign(planet.values.rotation), 11 / Math.sqrt(Math.pow((last + moon.radius) / 25, 3)));
            last += moon.radius + 10;
        });
    }
    function planetsDb () {
        var i, planets, last;
        planets = [];
        last = system.min;
        for (i = 0; i < 1; i++)
            planets.push(new Planet(_values.seed.createFrom(12 + i, 4)));
        planets.forEach(function (p) {
            o = new Orbit(400, 0, 0, 0)
                .addObject(p)
                .setVelocity(3);
            p.setDynamics(4, 1);
            if (p.radius > 7 || !(p.seed.parse(3) % 4))
                satellites(p);
        });
        return null;
    }
    function planets () {
        var i, count, planets, last;
        count = Math.round((_values.seed.ratio(12) * 5 + (system.binary ? 2 : system.A.radius / 100 * 5)));
        planets = [];
        last = (system.min - _values.seed.ratio(13) * 30) + 10;
        //  Create planets
        for (i = 0; i < count; i++)
            planets.push(new Planet(_values.seed.createFrom(12 + i, 4)));
        //  Define each planet
        planets.forEach(function (p, i) {
            var m, e, a, o, r, d;
            m = i < 10 ? 0 : 0.2;
            if ((planets[i + 1] && planets[i + 1].radius > 7) || p.radius < 4) {
                //  The planet is either before a large planet or a a very small planet
                e = round2(_values.seed.ratio(13 + i) * 0.2 + m);
            } else {
                e = round2(_values.seed.ratio(13 + i) * (p.radius < 4 ? 0.2 : 0.1) + m);
            }
            a = last + (e * 100); // Major axis
            o = new Orbit(a, e, Math.random() * 360, 0)
                .addObject(p)
                .setVelocity(round2(2 / Math.sqrt(Math.pow(a / _values.au, 3))));
            r = round2(_values.seed.ratio(14 + i) * 20 + p.radius);
            d = _values.seed.ratio(15 + i) > 0.93 ? -1 : 1;
            p.setDynamics(a < system.min ? 1 : r * d, 1);
            if (p.radius > 7 || !(p.seed.parse(3) % 4))
                satellites(p);
            last = a + (e * 100) + (50 * (i + 1));
        });
        return null;
    }

    function satellitesII (planet) {
        /*  Satellites:
            Satellite objects can be either natural satellites (moons) or rings.

            The number of natural satellites depends of two factors, the class of the
            planet and the distance from the system center
        */

        var satCount, // Satellite count
            ringCount, // Ring count
            s, // temp satellite variable
            v = Math.round(planet.seed.ratio(3) * 2), // variance, set [0, 2]
            last = planet.radius * 2.5 + 1; // "Theoretical" roche limit
        
        //  Define the satellite and ring count
        switch (planet.class) {
            case 3:
                satCount = v + 1;
                ringCount = Math.round(planet.seed.ratio(3) * 1 + 1);
                break
            case 4:
                satCount = v + 2;
                ringCount = Math.round(planet.seed.ratio(3) * 1 + 2);
                break
            default:
                satCount = v;
                ringCount = Math.round(planet.seed.ratio(3) * 1);
                break
        }

        //  Define satellites
        for (i = 0; i < satCount + ringCount; i++) {
            s = i % 2 ? new Satellite(_values.seed.createFrom(12 + i, 4), planet) : new Ring(_values.seed.createFrom(12 + i, 4), last);
            planet.orbit.addObject(s);
            s.setOrbit(s instanceof Satellite ? last + s.radius + 1 : 0, 0, 0, 0)
                .setDynamics(1, 1);
            console.log(s);
            console.log(s instanceof Satellite, s.radius, s.outerRadius);
            last += s instanceof Satellite ? s.radius * 3.5 : s.outerRadius;
            console.log(last);
        }
    }
    function planetsII () {
        /*  Planets:
            Planet objects are created on a number of variables pulled from the global
            seed string.

            The number of planets to create depends on three factors, first the seed's
            12th index value, if the system is binary and the class of the alpha star
            of the system. The `variance` value is a number between zero and five, and
            will be added the they system's `default` value. If the system is a binary
            star system, the `default` value will be two.
        */
        var i, count, planets, last;
        //  Derive planet count
        count = (function () {
            var v = Math.round(_values.seed.ratio(12) * 5), // variance, set [0, 5]
                d; // Default number of planets for the system type
            switch (system.A.class) {
                case 4: // Red Giant
                    d = Math.round(system.A.radius / 100 * 5);
                    break;
                case 5: // D
                    d = 1
                    break;
                default: // M, K, G, F
                    d = 2 + system.A.class;
                    break;
            }
            return v + system.binary ? 2 : d; // Return the variance and default
        }());
        //  Create planets
        planets = [];
        for (i = 0; i < count; i++)
            planets.push(function () { // Push new planet into the planets array
                switch (system.A.class) {
                    case 5:
                        return new Planet(_values.seed.createFrom(12 + i, 4)); // White dwarf stars have a hard time getting jovan planets
                    default:
                        return new Planet(_values.seed.createFrom(12 + i, 4));
                }
            }());
        //  Define planets and their orbits
        last = (_values.min - _values.seed.ratio(13) * 30) + 10; // set the default value for the last orbit
        planets.forEach(function (planet) {
            var m, e, a, o, r, d;
            m = i < 10 ? 0 : 0.2;
            if ((planets[i + 1] && planets[i + 1].radius > 7) || planet.radius < 4) {
                //  The planet is either before a large planet or a a very small planet
                e = round2(_values.seed.ratio(13 + i) * 0.2 + m);
            } else {
                e = round2(_values.seed.ratio(13 + i) * (planet.radius < 4 ? 0.2 : 0.1) + m);
            }
            a = last + (e * 100); // Major axis
            o = new Orbit(a, e, Math.random() * 360, 0)
                .addObject(planet)
                .setVelocity(round2(2 / Math.sqrt(Math.pow(a / _values.au, 3))));
            r = round2(_values.seed.ratio(14 + i) * 20 + planet.radius);
            d = _values.seed.ratio(15 + i) > 0.93 ? -1 : 1;
            planet.setDynamics(a < system.min ? 1 : r * d, 1);
            // if (p.radius > 7 || !(p.seed.parse(3) % 4))
            //     satellites(p);
            satellitesII(planet);
            last = a + (e * 100) + (50 * (i + 1));
        });
    }


    //  App Functions  //
    function create () {
        _values.seed = new Seed(Seed.create('', 32));
        system = new System();
        //  Create system objects
        stars();
        planetsII();
    }
    function build () {
        ORBITS.each(function (orbit) {
            LOOP.add(orbit.update.bind(orbit));
        });
        OBJECTS.each(function (object) {
            if (object instanceof Ring) {
                object.setMesh(object.innerRadius, object.outerRadius, 0xffffff);
            } else {
                object.setMesh(object.radius, 0xffffff);
            }
            scene.add(object.object3d);
            LOOP.add(object.update.bind(object));
        });
    }


    function init () {
        var canvas = $('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width() / canvas.height(), 1, 20000);
        renderer = new THREE.WebGLRenderer();

        camera.position.set(1000, 2000, 1000);
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
        scene.add(new Line(new THREE.Vector3(-10000, 0, 0), new THREE.Vector3(10000, 0, 0)).line); // X Axis
        scene.add(new OrbitEllipse(0, _values.au, _values.au).curve); // AU
        scene.add(new OrbitEllipse(0, _values.min, _values.min).curve); // Min
        create();
        build();
        // setTimeout(function () {
        //     stop();
        // }, 600);
        start();
    }
    init();
}());