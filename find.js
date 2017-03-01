/*
 * Bleh that was way too easy
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
