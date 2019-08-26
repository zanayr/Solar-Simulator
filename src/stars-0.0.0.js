var stars;
(function (s) {
    'use strict';
    var SEED,
        seeds = [];
    function age (S) {
        return ((parseInt(S.substr(0, 2), 16) / 255) * 8) + 2;
    }
    function seed() {
        SEED = ('xxxxxxxxxxxxxxxyxxxxxxxxxxxxxxxx').replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
        });
        return SEED;
    }
    stars = {
        age: age,
        seed: seed,
        test: function (times) {
            var total = 0;
            for (var i = 0; i < times; i++)
                seeds.push(age(seed()));
            seeds.forEach(function (s) {
                total = total + s;
            });
            return total / times;
        }
    };
}(stars));