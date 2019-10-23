var system,
    init;
(function () {
    var loop,
        seed,
        values = {au: 300, min: 200, speed: 0.004},
        camera,
        renderer,
        scene,
        controls;
    
    
    //  Auxillary Functions  //
    function barycenter (object1, object2, distance) {
        var a = round(object1.radius + object2.radius + distance);
        return {
            a: a,
            b: round(a * (object2.mass / (object1.mass + object2.mass))) * -1
        };
    }
    function period (distance) {
        return Math.sqrt(Math.pow(distance / system.min, 3));
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
    function round (value) {
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


    //  loop  //
    function update (step) {
        var i, l;
        for (i = 0, l = loop.updates.length; i < l; i++)
            loop.updates[i](toRadian(step));
        controls.update();
    }
    function render (step) {
        camera.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), toRadian(step)));
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
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
                update(360 / loop.timestep * values.speed);
                loop.delta -= loop.timestep;
                cycles++;
                if (cycles >= 240) {
                    loop.delta = 0;
                    break;
                }
            }
            //  Render Elements
            render(360 / loop.timestep * 0.01);
            loop.framId = window.requestAnimationFrame(main);
            return;
        }
    }
    function start () {
        if (!loop.state) {
            loop.frameId = window.requestAnimationFrame(function (timestamp) {
                loop.state = 1;
                render(0.00037);
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


    //  SEED  //
    function Seed (value) {
        Object.defineProperties(this, {
            length: {
                get: function () {
                    return this.value.length;
                }
            },
            value: {
                value: value
            }
        });
    }
    Seed.prototype.get = function (index) {
        return this.value[index % 32];
    };
    Seed.prototype.getSet = function (index, count) {
        var l = count && isFinite(count) ? count : 2;
        if (index + l > this.length)
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
        return (value.slice(0, length).padStart(length, 'x')).replace(/x/g, function () {
            return ((Math.round(Math.random() * 25) + (Math.random() > 0.5 ? 97 : 65)) % 16).toString(16);
        });
    };


    function System () {
        this.age = round(seed.ratio(0) * 12 + 1.8);
        this.binary = seed.ratio(1) >= 0.4;
        this.hydrogen = round(seed.ratio(2) * 0.2 + 0.9);
        this.iron = round(seed.ratio(3) * 0.1 + 0.1);
        this.name = seed.value;
        this.seed = seed;
        this.starDensity = round(seed.ratio(4) * (this.hydrogen - 0.83) + 1.2);
        Object.defineProperties(this, {
            min: {
                get: function () {
                    var min = 0;
                    Epsilon.object.each(function (object) {
                        var m = 0;
                        if (object instanceof Star && object.orbit instanceof Epsilon.Orbit)
                            m = Math.abs(object.orbit.values.semiMajorAxis) + object.orbit.values.e * Math.abs(object.orbit.values.semiMajorAxis) + object.radius * 2.5;
                        min = min < m ? m : min;
                    });
                    return min;
                }
            },
            store: {
                value: {}
            }
        });
    }
    System.prototype.setLabel = function (object, label) {
        if (object instanceof Epsilon.Celestial) {
            Object.defineProperty(this, label, {
                get: function () {
                    return Epsilon.object.get(this.store[label + 'Id']);
                }
            });
            Object.defineProperty(this.store, label + 'Id', {
                value: object.id
            });
        }
        return this;
    };
    System.prototype.toggleOrbits = function () {
        Epsilon.ellipse.each(function (ellipse) {
            ellipse.toggle();
        });
        return this;
    };


    function Star (s) {
        Epsilon.Celestial.call(this);
        this.class = probability([
            Math.round(150 - (100 * system.hydrogen)),
            Math.round(175 - (100 * system.hydrogen)),
            Math.round(190 - (100 * system.hydrogen))
        ], s.ratio(0));
        this.radius = round(s.ratio(1) * 20 + (this.class ? 140 + (this.class - 1) * 20 : 40));
        this.mass = round(system.starDensity * volume(this.radius) / 10000);
        this.seed = s;
    }
    Star.prototype = Object.create(Epsilon.Celestial.prototype);
    Star.prototype.constructor = Star;
    Star.prototype.age = function () {
        var v = this.class !== 3 ? 20 : 3,
            m = this.class !== 3 ? 240 : 6;
        if (this.class && system.age >= 10 - this.class) {
            this.radius = round(this.seed.ratio(1) * v + m);
            this.class = this.class !== 3 ? 4 : 5;
        }
        return this;
    };
    function Planet (s, prob) {
        var rC;
        Epsilon.Celestial.call(this);
        var p = prob && Array.isArray(prob) ? prob : [
            Math.round((200 * system.iron) - 10),
            Math.round((500 * system.iron) - 30),
            Math.round((300 * system.iron) + 30)
        ];
        this.class = probability(p, s.ratio(0));
        this.radius = round(s.ratio(1) * (this.class !== 3 ? 2 : 4) + (3 * this.class + 2));
        this.mass = round(s.ratio(2) + (this.class > 1 ? 4.5 : 4 - this.class) * volume(this.radius) / 10000);
        this.seed = s;
        Object.defineProperty(this, 'period', {
            get: function () {
                if (this.orbit.values.semiMajorAxis)
                    return Math.sqrt(Math.pow(this.orbit.values.semiMajorAxis / values.au, 3));
                return 0;
            }
        });
        Object.assign(this.values, (function (c) {
            var r = 0;
            switch (c) {
                case 0:
                    return {ringCount: s.ratio(3) > 0.95 ? 1 : 0, satelliteCount: s.ratio(3) > 0.90 ? 1 : 0};
                case 1:
                    return {ringCount: s.ratio(3) > 0.90 ? 1 : 0, satelliteCount: s.ratio(3) > 0.75 ? Math.round(s.ratio(3) * 1 + 1) : 0};
                case 2:
                    return {ringCount: s.ratio(3) > 0.66 ? 1 : 0, satelliteCount: Math.round(s.ratio(3) * 1 + 1)};
                case 3:
                    r = s.ratio(3) > 0.66 ? 3 : 1;
                    return {ringCount: r, satelliteCount: Math.round(s.ratio(3) * (4 - r) + 1)};
            }
        }(this.class)));
    }
    Planet.prototype = Object.create(Epsilon.Celestial.prototype);
    Planet.prototype.constructor = Planet;

    function Satellite (prime, s) {
        Epsilon.Celestial.call(this);
        this.class = probability([prime.radius <= 7 ? 50 : 90], s.ratio(0)); // 2 classes natural or captured
        if (prime.radius <= 7) {
            this.radius = round(s.ratio(1) * (0.5 * prime.radius) + 0.5);
        } else {
            this.radius = round(s.ratio(1) * 4 + 1);
        }
        this.mass = round(s.ratio(2) + (this.class > 1 ? 4.5 : 4 - this.class) * volume(this.radius) / 10000);
        this.seed = s;
    }
    Satellite.prototype = Object.create(Epsilon.Celestial.prototype);
    Satellite.prototype.constructor = Satellite;

    function Ring (prime, s, inner) {
        Epsilon.Ring.call(this);
        this.class = probability([prime.radius <= 11 ? 50 : 90], s.ratio(0)); // 2 classes, ring or large
        this.inner = inner;
        this.outer = this.class ? round(s.ratio(1) * (prime.radius / 2) + 3) : 1;
        this.seed = s;
    }
    Ring.prototype = Object.create(Epsilon.Ring.prototype);
    Ring.prototype.constructor = Ring;



    function binaryPlanet (s, d, prob) {
        var a, b, c, p1, p2;
        p1 = new Planet(s, prob);
        p2 = new Planet(new Seed(s.value.split('').reverse().join('')), prob);
        //  Find the barycenter
        a = p1.mass >= p2.mass ? p1 : p2;
        b = a.id === p1.id ? p2 : p1;
        c = barycenter(a, b, 10);
        //  Define orbit
        e = s.ratio(0) * 0.1;
        new Epsilon.Orbit(d, round(s.ratio(0) * 0.1), Math.random() * 360, 0, 2 / round(period(d)))
            .addObject(p1)
            .addObject(p2);
        //  Return planets
        return [a.addOrbit(c.b), b.addOrbit(c.a + c.b)];
    }
    function uniaryPlanet (s, d, prob) {
        var e, p;
        p = new Planet(s, prob);
        //  Define orbit
        e = s.ratio(0) * 0.1;
        if (d > values.au * 3 || p.radius <= 3)
            e += s.ratio(1) * 0.2;
        new Epsilon.Orbit(d, round(e), Math.random() * 360, 0, 2 / round(period(d)))
            .addObject(p);
        //  Return planet
        return [p];
    }
    function cthonian (s, o) {
        var n, l, i; // number, last orbit, iterator, s = star
        n = (s.seed.parse(0) % 2) + 1;
        l = s.radius;
        for (i = 0; i < n; i++)
            (function () {
                //  p = planet, a = major, e = eccentricity
                var p = new Planet(seed.createFrom(8 + i + o, 4)),
                    a = round(p.seed.ratio(0) * 10 + 10 + p.radius),
                    e = round(p.seed.ratio(1) * 0.25);
                s.orbit.addObject(p);
                p.addOrbit(a + l, e, 0, 0)
                    .setDynamics(1, i ? 8 : 10);
                l += (Math.abs(a) + Math.abs(a) * e) + 10;
            }());
        return null;
    }
    function planets () {
        var n, l, i; // number, last orbit, iterator, p = planet
        if (system.A.class < 4) {
            n = Math.round(seed.ratio(12) * 5) + (system.binary ? 2 : 2 + system.A.class);
        } else if (system.A.class === 4) {
            n = Math.round(system.A.radius / 100 * 5.5);
        } else {
            n = Math.round(seed.ratio(12) * 3);
        }
        l = system.min - seed.ratio(13) * 50 + 25;
        scene.add(Epsilon.ellipse2(0, system.min, system.min, 0xff0000));
        for (i = 0; i < n; i++, l += l / 3) {
            if (seed.ratio(i) > 0.98 && l > system.min + 10) {
                console.log('binary!');
                binaryPlanet(seed.createFrom(12 + i, 4), l).forEach(function (p) {
                    p.setDynamics(p.seed.ratio(2) > 0.93 ? -1 : 1, 60);
                });
            } else {
                uniaryPlanet(seed.createFrom(12 + i, 4), l).forEach(function (p) {
                    p.setDynamics((l < system.min + 10 ? 1 : p.seed.ratio(1) * 20 + 40) * (p.seed.ratio(2) > 0.93 ? -1 : 1));
                });
            }
        }
        return null;
    }
    function populateSatellites () {
        Epsilon.object.each(function (object, i) {
            var sC, rC, last, j, s, r;
            if (object instanceof Planet && object.orbit.objects.length < 2) {
                sC = object.values.satelliteCount;
                rC = object.values.ringCount;
                last = object.radius * 2.5 + object.seed.ratio(2) * 2.5; // last orbit = roche limit + 0 - 2.5;
                for (j = 0, l = sC + rC; j < l; j++) {
                    if (j % 2 && sC) {
                        s = new Satellite(object, seed.createFrom(20 + i + j, 4));
                        r = s.radius + 1;
                        sC--;
                    } else {
                        s = new Ring(object, seed.createFrom(20 + i + j, 4), last + r);
                        r = 1;
                    }
                    object.orbit.addObject(s);
                    if (s instanceof Satellite) {
                        s.addOrbit(last, s.seed.ratio(1) * 0.3, Math.random() * 360, 0)
                            .setDynamics(1, 100 / Math.sqrt(Math.pow(last / object.radius, 3)));
                    } else {
                        //  Do something
                    }
                    last += last / 2;
                }
            }
        });
    }
    function satellites () {
        Epsilon.object.each(function (object) {
            var n, l, i, s; // number, last orbit, iterator, satellite
            if (object instanceof Planet && object.period >= 1 && object.orbit.objects.length === 1) {
                n = 0;
                switch (object.class) {
                    case 0:
                        if (object.seed.ratio(2) > 0.9)
                            n = 1;
                        break;
                    case 1:
                        if (object.seed.ratio(2) > 0.66)
                            n = (object.seed.parse(1) % 2) + 1;
                        break;
                    case 2:
                        n = (object.seed.parse(1) % 2) + 1;
                        break;
                    case 3:
                    default:
                        n = (object.seed.parse(1) % 3) + 1;
                        break;
                }
            }
            l = object.radius * 2.5 + object.seed.ratio(2) * 2.5;
            for (i = 0; i < n; i++, l += l / 3) {
                s = new Satellite(object, seed.createFrom(20 + i, 4));
                object.orbit.addObject(s);
                s.addOrbit(l, s.seed.ratio(1) * 0.3, Math.random() * 360, 0)
                    .setDynamics(1, 100 / Math.sqrt(Math.pow(l / object.radius, 3)));
            }
        });
    }
    function binaryStar () {
        var star1 = new Star(seed.createFrom(4, 4)),
            star2 = new Star(seed.createFrom(8, 4)),
            bc;
        if (star1.mass >= star2.mass) {
            system.setLabel(star1.age(), 'A')
                .setLabel(star2.age(), 'B');
        } else {
            system.setLabel(star2.age(), 'A')
                .setLabel(star1.age(), 'B');
        }
        bc = barycenter(system.A, system.B, 200);
        new Epsilon.Orbit(bc.b, system.B.seed.ratio(2) * 0.1, 0, 0, 1)
            .addObject(system.A);
        new Epsilon.Orbit(bc.a + bc.b, system.A.seed.ratio(2) * 0.2, 0, 0, 1)
            .addObject(system.B);
        //  Cthonian planets
        if (star1.seed.ratio(0) > 0.5)
            cthonian(star1, 1);
        if (star2.seed.ratio(0) > 0.5)
            cthonian(star2, 2);
        return null;
    }
    function uniaryStar () {
        var star = new Star(seed.createFrom(4, 4));
        system.setLabel(star, 'A');
        new Epsilon.Orbit(0, 0, 0, 0, 1)
            .addObject(star.age());
        //  Cthonian planets
        if (star.seed.ratio(0) > 0.5)
            cthonian(star, 1);
        return null;
    }




    function create () {
        system = new System();
        if (system.binary) {
            binaryStar();
        } else {
            uniaryStar();
        }
        planets();
        // satellites();
        populateSatellites();
        return null;
    }
    function build () {
        Epsilon.orbit.each(function (orbit) {
            if (orbit.ellipse)
                scene.add(orbit.ellipse.object3d);
            loop.add(orbit.update.bind(orbit));
        });
        Epsilon.object.each(function (object) {
            object.createMesh(0xffffff);
            scene.add(object.object3d);
            loop.add(object.update.bind(object));
        });
        Epsilon.ellipse.each(function (ellipse) {
            scene.add(ellipse.object3d);
            loop.add(ellipse.update.bind(ellipse));
        });
        // system.toggleOrbits();
        return null;
    }

    function setControls() {
        // controls.target.set(scene.position);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        controls.keys = [65, 83, 68];
        controls.addEventListener('change', function () {
            camera = camera;
            renderer.render(scene, camera);
        });
    }


    function init() {
        var canvas = $('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width() / canvas.height(), 1, 20000);
        renderer = new THREE.WebGLRenderer();

        camera.position.set(1000, 1000, 1000);
        camera.lookAt(scene.position);

        renderer.setSize(canvas.width(), canvas.height());
        renderer.setClearColor(0x000000, 1);

        canvas.append(renderer.domElement);

        controls = new THREE.TrackballControls(camera, renderer.domElement);
        setControls();
        
        //  Global Variables  //
        loop = new Loop(60);
        seed = new Seed(Seed.create('', 32));

        window.onresize = function (e) {
            camera.aspect = canvas.width() / canvas.height();
            camera.updateProjectionMatrix();

            renderer.setSize(canvas.width(), canvas.height());
            controls.handleResize();
        };

        //  DEBUGGING
        // scene.add(Epsilon.line([-5, 0, 0], [5, 0, 0], 0xffffff)); // (0, 0, 0) point
        // scene.add(Epsilon.line([0, 0, 5], [0, 0, -5], 0xffffff)); // (0, 0, 0) point
        // scene.add(Epsilon.line([-10000, 0, 0], [10000, 0, 0], 0xff0000)); // X Axis
        // scene.add(Epsilon.line([0, -10000, 0], [0, 10000, 0], 0x00ff00)); // Y Axis
        // scene.add(Epsilon.line([0, 0, -10000], [0, 0, 10000], 0x0000ff)); // Z Axis
        // setTimeout(function (){
        //     stop();
        // }, 1000);

        //  Initialize objects and store loop
        create();
        build();
        start();
        return null;
    }

    //  Initialize app
    init();
}());