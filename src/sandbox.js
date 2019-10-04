var scene,
    system,
    sphere,
    sphere2,
    line;
(function () {
    var camera,
        renderer;

    function Sphere (r, major, minor) {
        this.radius = r;
        this.a = major;
        this.b = minor;
        this.e = Math.sqrt(1 - (Math.pow(minor, 2) / Math.pow(major, 2)));
        this.c = this.e * major;
        console.log(this.c);
        // this.r = 100;
        this.geometry = new THREE.SphereGeometry(r, 13, 13);
        this.material = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
    }
    function Line (dir, len, color) {
        this.length = len;
        this.material = new THREE.LineBasicMaterial({color: color});
        this.geometry = new THREE.Geometry();
        if (dir === 'x') {
            this.geometry.vertices.push(new THREE.Vector3(0, 0, 0));
            this.geometry.vertices.push(new THREE.Vector3(len, 0, 0));
        } else if (dir === 'y') {
            this.geometry.vertices.push(new THREE.Vector3(0, 0, 0));
            this.geometry.vertices.push(new THREE.Vector3(0, len, 0));
        } else if (dir === 'z') {
            this.geometry.vertices.push(new THREE.Vector3(0, 0, 0));
            this.geometry.vertices.push(new THREE.Vector3(0, 0, len));
        }
        this.mesh = new THREE.Line(this.geometry, this.material);
    }
    Sphere.prototype.update = function (t) {
        var r = (this.a * (1 - Math.pow(this.e, 2)) / (1 + this.e * Math.cos(t)));
        this.mesh.rotation.y += 0.01;
        this.mesh.position.x = this.c + r * Math.cos(t) + Math.sqrt(Math.pow(this.a, 2) - Math.pow(this.b, 2));
        this.mesh.position.z = r *  Math.sin(t);
    };
    function loop () {
        var time = Date.now() * 0.000625;
        requestAnimationFrame(loop);
        sphere.update(time);
        sphere2.update(time * 10);
        renderer.render(scene, camera);
    }
    function create () {
        var x = new Line('x', 100, 0xff0000),
            y = new Line('y', 100, 0x00ff00),
            z = new Line('z', 100, 0x0000ff),
            u = new Line('y', 100, 0xffffff),
            v = new Line('y', 100, 0xffffff);
        sphere = new Sphere(50, 200, 180);
        sphere2 = new Sphere(10, 100, 80);
        scene.add(sphere.mesh);
        sphere.mesh.add(sphere2.mesh);
        u.mesh.position.x = Math.sqrt(Math.pow(sphere.a, 2) - Math.pow(sphere.b, 2));
        v.mesh.position.x = Math.sqrt(Math.pow(sphere.a, 2) - Math.pow(sphere.b, 2)) * -1;
        scene.add(x.mesh);
        scene.add(y.mesh);
        scene.add(z.mesh);
        scene.add(u.mesh);
        scene.add(v.mesh);
        var curve = new THREE.EllipseCurve(0, 0, 200, 180, 0, 2 * Math.PI, false, 0);
        var g = new THREE.Geometry();
        var points = curve.getPoints(50);
        for (i in points)
            g.vertices.push(new THREE.Vector3(points[i].x, points[i].y, 0));

        
        var m = new THREE.LineBasicMaterial( { color : 0xffffff } );
        
        // Create the final object to add to the scene
        var ellipse = new THREE.Line( g, m );
        ellipse.position.x = Math.sqrt(Math.pow(sphere.a, 2) - Math.pow(sphere.b, 2));
        ellipse.rotation.x = Math.PI / 2;
        scene.add(ellipse);
        loop();
        // renderer.render(scene, camera);
    }
    function init () {
        canvas = grab('#canvas');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, canvas.width / canvas.height, 1, 20000);
        camera.position.set(2000, 2000, 2000);
        camera.lookAt(scene.position);
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(canvas.width, canvas.height);
        renderer.setClearColor(0x000000, 1);
        canvas.append(renderer.domElement);
    }
    init();
    create();
}());