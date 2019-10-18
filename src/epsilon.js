var Epsilon = (function () {
    var ELLIPSES,
        OBJECTS,
        ORBITS
    //  AUXILLARY FUNCTIONS  //
    function epsilonId () {
        return ('xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    //  Shape Functions  //
    function epsilonEllipse (f, a, b, color) {
        var curve = new THREE.EllipseCurve(f, 0, a, b, 0, 2 * Math.PI, false, 0),
            points = curve.getPoints(Math.floor(Math.abs(a))),
            geometry = new THREE.Geometry();
        points.forEach(function (point) {
            //  As a result of the orientation of the THREEjs coordinate system, each
            //  point's y coordinate, is transfered to the z coordinate of the new
            //  vector object
            geometry.vertices.push(new THREE.Vector3(point.x, 0, point.y));
        });
        return new THREE.Line(geometry, new THREE.LineBasicMaterial({color: color}));
    }
    function epsilonLine (a, b, color) {
        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(a[0], a[1], a[2]));
        geometry.vertices.push(new THREE.Vector3(b[0], b[1], b[2]));
        return new THREE.Line(geometry, new THREE.LineBasicMaterial({color: color}));
    }
    function epsilonRing (i, o, u, color) {
        return new THREE.Mesh(
            new THREE.RingGeometry(i, o, u),
            new THREE.MeshBasicMaterial({color: color, wireframe: true})
        );
    }
    function epsilonSphere (r, u, v, color) {
        return new THREE.Mesh(
            new THREE.SphereGeometry(r, u, v),
            new THREE.MeshBasicMaterial({color: color, wireframe: true})
        );
    }


    //  STORE  //
    function EpsilonStore () {
        Object.defineProperties(this, {
            store: {
                value: {}
            },
            ids: {
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
    EpsilonStore.prototype.add = function (object) {
        if (object.id && !this.ids.includes(object.id)) {
            this.store[object.id] = object;
            return true;
        }
        return true;
    };
    EpsilonStore.prototype.each = function (fn, args) {
        var i, l;
        for (i = 0, l = this.length; i < l; i++)
            if (typeof fn === 'function')
                fn.apply(null, [this.store[this.ids[i]], i].concat(Array.isArray(args) ? args : []));
        return this;
    };
    EpsilonStore.prototype.get = function (id) {
        if (this.ids.includes(id))
            return this.store[id];
        return null;
    };

    //  COLLECTION  //
    function EpsilonCollection () {
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
            ids: {
                get: function () {
                    this.store.slice(0);
                }
            }
        });
    }
    EpsilonCollection.prototype.add = function (object) {
        if (!this.store.includes(object.id))
            this.store = this.store.concat(object.id);
        return object.id;
    };
    EpsilonCollection.prototype.remove = function (id) {
        if (this.store.includes(id)) {
            this.store = this.store.filter(function (id) {
                return id !== id;
            });
            return true;
        }
        return false;
    };
    EpsilonCollection.prototype.each = function (fn) {
        var i;
        for (i = 0, len = this.length; i < len; i++)
            fn.apply(null, [OBJECTS.get(this.store[i]), i]);
        return this;
    };
    EpsilonCollection.prototype.get = function (id) {
        if (this.store.includes(id))
            return OBJECTS.get(id);
        return null;
    };


    //  BASE EPSILON OBJECTS  //
    //  Ellipse  //
    function EpsilonOrbitEllipse (foci, major, minor, color) {
        Object.defineProperties(this, {
            ellipse: {
                value: epsilonEllipse(foci, major, minor, color)
            },
            focus: {
                value: [
                    [epsilonLine([-10, 0, 0], [10, 0, 0], color), epsilonLine([0, 0, -10], [0, 0, 10], color)], // Origin
                    // [epsilonLine([foci - 5, 0, 0], [foci + 5, 0, 0], color), epsilonLine([foci, 0, -5], [foci, 0, 5], color)] // Far foci
                ]
            },
            id: {
                value: epsilonId()
            },
            object3d: {
                value: new THREE.Object3D()
            },
            store: {
                value: {}
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
        this.object3d.add(this.ellipse);
        this.focus.forEach(function (foci) {
            this.object3d.add(foci[0]);
            this.object3d.add(foci[1]);
        }.bind(this));
        ELLIPSES.add(this);
    }
    EpsilonOrbitEllipse.prototype.rotate = function (theta) {
        this.object3d.rotation.y = (theta % 360) * (Math.PI / 180);
        return this;
    };
    EpsilonOrbitEllipse.prototype.toggle = function () {
        this.ellipse.visible = !this.ellipse.visible;
        this.focus.forEach(function (foci) {
            foci[0].visible = !foci[0].visible; // horizontal
            foci[1].visible = !foci[1].visible; // vertical
        });
        return this;
    };
    EpsilonOrbitEllipse.prototype.update = function () {
        if (this.orbit instanceof EpsilonOrbit) {
            this.x = this.orbit.x;
            this.z = this.orbit.z;
        }
        return this;
    }


    //  Epsilon  //
    function EpsilonObject () {
        Object.defineProperties(this, {
            object3d: {
                value: new THREE.Object3D()
            },
            polarCoordinate: {
                get: function () {
                    var r = this.values.semiLatusRectum / (1 - this.values.e * Math.cos(this.values.theta));
                    return {r: r, theta: this.values.theta};
                }
            },
            store: {
                value: {}
            },
            id: {
                value: epsilonId()
            },
            values: {
                value: {
                    d: 0,
                    e: 0,
                    phi: 0,
                    rotation: 1,
                    semiLatusRectum: 0,
                    semiMajorAxis: 0,
                    semiMinorAxis: 0,
                    theta: 0,
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
    EpsilonObject.prototype.update = function (radian) {
        this.values.theta += radian * this.values.velocity;
        this.x = this.polarCoordinate.r * Math.cos(this.polarCoordinate.theta - this.values.phi) + this.orbit.x + this.values.d;
        this.z = this.polarCoordinate.r * Math.sin(this.polarCoordinate.theta - this.values.phi) + this.orbit.z;
        this.rotation = this.values.rotation * (this.polarCoordinate.r ? this.polarCoordinate.theta : this.orbit.values.theta);
    }


    //  Orbit  //
    function EpsilonOrbit (major, ecc, theta, phi, velocity) {
        var a = major && isFinite(major) ? major : 0,
            e = ecc && isFinite(ecc) ? ecc : 0,
            b = Math.sqrt((a * (1 - e)) * (a * (1 + e)));
        Object.defineProperties(this, {
            ellipse: {
                get: function () {
                    return ELLIPSES.get(this.store.ellipseId);
                }
            },
            id: {
                value: epsilonId()
            },
            objects: {
                value: new EpsilonCollection()
            },
            polarCoordinate: {
                get: function () {
                    var r = this.values.semiLatusRectum / (1 - this.values.e * Math.cos(this.values.theta));
                    return {r: r, theta: this.values.theta};
                }
            },
            values: {
                value: {
                    d: -2 * a * e,
                    e: e,
                    phi: (phi % 360) * (Math.PI / 180),
                    semiLatusRectum: a * (1 - Math.pow(e, 2)),
                    semiMajorAxis: a,
                    semiMinorAxis: b,
                    theta: (theta % 360) * (Math.PI / 180),
                    velocity: velocity && isFinite(velocity) ? velocity : 1
                }
            },
            store: {
                value: {
                    ellipseId: new EpsilonOrbitEllipse(-1 * e * a, a, b, 0xffffff).id
                }
            },
            x: {
                get: function () {
                    return this.polarCoordinate.r * Math.cos(this.polarCoordinate.theta - this.values.phi) + this.values.d;
                }
            },
            z: {
                get: function () {
                    return this.polarCoordinate.r * Math.sin(this.polarCoordinate.theta - this.values.phi);
                }
            }
        });
        this.ellipse.rotate(this.values.phi / (Math.PI / 180));
        ORBITS.add(this);
    }
    EpsilonOrbit.prototype.addObject = function (object) {
        var id;
        if (object instanceof EpsilonCelestial || object instanceof EpsilonOrbitEllipse) {
            id = this.id;
            this.objects.add(object);
            Object.defineProperty(object, 'orbit', {
                get: function () {
                    return ORBITS.get(object.store.orbitId);
                }
            });
            Object.defineProperty(object.store, 'orbitId', {
                value: id
            });
        }
        return this;
    };
    EpsilonOrbit.prototype.update = function (radian) {
        this.values.theta += radian * this.values.velocity;
        return this;
    };


    //  EPSILON OBJECTS  //
    //  Celestial  //
    function EpsilonCelestial () {
        EpsilonObject.call(this);
        Object.defineProperties(this, {
            rotation: {
                get: function () {
                    return this.mesh.rotation.y;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.mesh.rotation.y = value * -1;
                    return value;
                }
            }
        });
    }
    EpsilonCelestial.prototype = Object.create(EpsilonObject.prototype);
    EpsilonCelestial.prototype.constructor = EpsilonCelestial;
    EpsilonCelestial.prototype.addOrbit = function (major, ecc, theta, phi) {
        var e = ecc && isFinite(ecc) ? ecc : 0,
            a = major && isFinite(major) ? major : 0,
            b = Math.sqrt((a * (1 - e)) * (a * (e + 1)));
        if (this.orbit instanceof EpsilonOrbit) {
            Object.assign(this.values, {
                d: -2 * a * e,
                e: e,
                phi: phi && isFinite(phi) ? (phi % 360) * (Math.PI / 180) + this.orbit.values.phi : this.orbit.values.phi,
                semiLatusRectum: a * (1 - Math.pow(e, 2)),
                semiMajorAxis: a,
                semiMinorAxis: b,
                theta: theta && isFinite(theta) ? (theta % 360) * (Math.PI / 180) : 0
            });
            this.orbit.addObject(new EpsilonOrbitEllipse(e * a * -1, a, b, 0xffffff).rotate(this.values.phi / (Math.PI / 180)));
        }
        return this;
    };
    EpsilonCelestial.prototype.setDynamics = function (rotation, velocity) {
        if (this.orbit instanceof EpsilonOrbit)
            Object.assign(this.values, {
                rotation: rotation && isFinite(rotation) ? rotation : 1,
                velocity: velocity && isFinite(velocity) ? velocity : 1
            });
        return this;
    };
    EpsilonCelestial.prototype.createMesh = function (color) {
        var u = Math.floor(this.radius / 20) + 13;
        this.mesh = epsilonSphere(this.radius, u, u, color);
        this.object3d.add(this.mesh);
        // this.mesh.add(epsilonLine([(this.radius + 10) * -1, 0, 0], [this.radius + 10, 0, 0], 0xffffff));
        // this.mesh.add(epsilonLine([0, (this.radius + 10) * -1, 0], [0, this.radius + 10, 0], 0xffffff));
        // this.mesh.add(epsilonLine([0, 0, (this.radius + 10) * -1], [0, 0, this.radius + 10], 0xffffff));
        return this;
    };
    
    
    //  Ring  //
    function EpsilonRing () {
        EpsilonObject.call(this);
        Object.defineProperties(this, {
            rotation: {
                get: function () {
                    return this.mesh.rotation.z;
                },
                set: function (value) {
                    if (value && isFinite(value))
                        this.mesh.rotation.z = value;
                    return value;
                }
            }
        });
    };
    EpsilonRing.prototype = Object.create(EpsilonObject.prototype);
    EpsilonRing.prototype.constructor = EpsilonRing;
    EpsilonRing.prototype.createMesh = function (color) {
        this.mesh = epsilonRing(this,inner, this.outer, Math.floor(this.outer / 2) + 13, color);
        this.object3d.add(this.mesh);
    };


    //  INIT FUNCTION  //
    function init () {
        ELLIPSES = new EpsilonStore();
        OBJECTS = new EpsilonStore();
        ORBITS = new EpsilonStore();
    }


    //  Initialize
    init();
    //  EPSILON LIBRARY  //
    return {
        Celestial: EpsilonCelestial,
        ellipse: ELLIPSES,
        ellipse2: epsilonEllipse,
        line: epsilonLine,
        object: OBJECTS,
        orbit: ORBITS,
        Orbit: EpsilonOrbit,
        Ring: EpsilonRing
    };
}());