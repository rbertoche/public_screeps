/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('memory');
 * mod.thing == 'a thing'; // true
 */


function isIterable(obj) {
  // checks for null and undefined
  if (obj === null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

function pack(value){

    // console.log('pack ' + value + ' of type ' + typeof value);
    if(value instanceof RoomObject && typeof value.id === 'string'){
        value = value.id
    } else if ( value && typeof value === 'object' ){
        /*
        console.log('pack x ' + value.Spawn1);
        console.log('pack y ' + value['Spawn1']);
        console.log('pack keys ' + Object.keys(value))
        */
        if (value.id !== undefined){
            console.log('pack should not be called on GameObject snapshot Objects');
            return null;
        }
        let ret = {};
        let keys = Object.keys(value);
        for (let i in keys){
            let key = keys[i];
            if (value[key] !== undefined){
                // console.log('pack value1', key, value[key])
                ret[key] = pack(value[key]);
                // console.log('pack value2', key, value[key])
            }
        }

        value = ret;
    } else if(isIterable(value) && typeof value !== 'string'){
        let ret = [];
        for (let k in value){
            ret.push(pack(value[k]));
        }
        value = ret;
    }
    return value
}

function unpack(value){
    let ret;
    if (typeof value === 'string' && value.length === 24){
        return Game.getObjectById(value);
    } else if (isIterable(value)){
        ret = [];
        for (let k in value){
            ret.push(unpack(value[k]));
        }
        return ret;
    } else if ( typeof value === 'object' ){
        if (!value){
            console.log('unpack should not be called on null objects');
            return null;
        }
        if (value.id !== undefined){
            console.log('unpack should not be called on GameObject snapshot objects');
            return null;
        }
        ret = {};
        let keys = Object.keys(value);
        for (let i in keys){
            let key = keys[i];
            ret[key] = unpack(value[key]);
        }

        return ret;
    } else {
        console.log('unpack should be called on ids and arrays, not ' + value + ' of type ' + typeof value);
        return null;
    }
}

function define(memory, key, value){
    if (memory[key] === undefined){
        if(typeof value === 'function'){
            value = value();
        }
        set(memory, key, value);
    }
}

function set(memory, key, value){
    if (value !== undefined){
        memory[key] = pack(value);
    }
}

function get(memory, key){
    return unpack(memory[key]);
}


/*
function is_tower(structure){
    return structure.structureType === STRUCTURE_EXTENSION;
}

define('extension', function(){
    let ret = Game.rooms.sim.find(FIND_STRUCTURES);
    return _.filter(ret, is_tower)
    if (ret.length){
        return ret[0];
    }
})
define('spawns', {Spawn1: Game.spawns.Spawn1})
console.log('spawns: ' + get('spawns'))
console.log('spawn1: ' + get('spawns').Spawn1)
*/


module.exports = {

    pack: pack,
    unpack: unpack,
    define: define,
    set: set,
    get: get,
};
