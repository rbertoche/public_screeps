/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('find');
 * mod.thing == 'a thing'; // true
 */

module.exports = function find(type, opts){
    ret = [];
    let keys = Object.keys(Game.rooms);
    for (var i in keys){
        let key = keys[i];
        if (Game.rooms[key]){
            ret = ret.concat(Game.rooms[key].find(type, opts));
        }
    }
    return ret;
};
