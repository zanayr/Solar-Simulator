var system,
    init;
(function () {
    var loop,
        seed = null,
        values = {au: 300, min: 200, speed: 0.01},
        camera = null,
        renderer = null,
        scene = null;
    
    
    //  Auxillary Functions  //
    function barycenter (object1, object2, distance) {
        var a = round(object1.radius + object2.radius + distance);
        console.log(round(object1.radius + object2.radius + distance), a);
        return {
            a: a,
            b: round(a * (object2.mass / (object1.mass + object2.mass))) * -1
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
            // loop.updates[i](toRadian(step));
    }
    function render (step) {
        // camera.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), toRadian(step)));
        // camera.lookAt(scene.position);
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


    function System () {
        this.age = round(seed.ratio(0) * 12 + 1.8);
        this.binary = seed.ratio(1) >= 0.4;
        this.hydrogen = round(seed.ratio(2) * 0.2 + 0.9);
        this.iron = round(seed.ratio(3) * 0.1 + 0.1);
        this.name = seed.value;
        this.seed = seed;
        this.starDensity = round(seed.ratio(4) * (this.hydrogen - 0.83) + 1.2);
        Object.defineProperty(this, 'store', {
            value: {}
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


    function Star (seed) {
        Epsilon.Celestial.call(this);
        this.class = probability([
            Math.round(150 - (100 * system.hydrogen)),
            Math.round(175 - (100 * system.hydrogen)),
            Math.round(190 - (100 * system.hydrogen))
        ], seed.ratio(0));
        this.radius = round(seed.ratio(1) * 20 + (this.class ? 140 + (this.class - 1) * 20 : 40));
        this.mass = round(system.starDensity * volume(this.radius) / 10000);
        this.seed = seed;
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


    function binary () {
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
        new Epsilon.Orbit(bc.b, seed.ratio(4) * 0.1, 0, 0, 1)
            .addObject(system.A);
        new Epsilon.Orbit(bc.a + bc.b, seed.ratio(8) * 0.2, 0, 0, 1)
            .addObject(system.B);

    }
    function uniary () {
        var star = new Star(seed.createFrom(4, 4));
        system.setLabel(star, 'A');
        new Epsilon.Orbit(100, 0, 0, 0, 1)
            .addObject(star.age());
    }


    function create () {
        system = new System();
        if (true) {
            binary();
        } else {
            uniary();
        }
        // planets();
        // satellites();
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
        return null;
    }
    reload = function (s) {
        seed = new Seed(Seed.create(s, 32));

    }
    function init() {
        var canvas = $('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width() / canvas.height(), 1, 20000);
        renderer = new THREE.WebGLRenderer();

        camera.position.set(0, 2000, 0);
        camera.lookAt(scene.position);

        renderer.setSize(canvas.width(), canvas.height());
        renderer.setClearColor(0x000000, 1);

        canvas.append(renderer.domElement);
        
        //  Global Variables  //
        loop = new Loop(60);
        seed = new Seed(Seed.create('', 32));

        //  DEBUGGING
        scene.add(Epsilon.line([-5, 0, 0], [5, 0, 0], 0xffffff)); // (0, 0, 0) point
        scene.add(Epsilon.line([0, 0, 5], [0, 0, -5], 0xffffff)); // (0, 0, 0) point
        // scene.add(Epsilon.line([-10000, 0, 0], [10000, 0, 0], 0xff0000)); // X Axis
        // scene.add(Epsilon.line([0, -10000, 0], [0, 10000, 0], 0x00ff00)); // Y Axis
        // scene.add(Epsilon.line([0, 0, -10000], [0, 0, 10000], 0x0000ff)); // Z Axis

        //  Initialize objects and store loop
        create();
        build();
        start();
        return null;
    }

    //  Initialize app
    init();
}());