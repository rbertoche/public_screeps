/*
 * creep helper code
 */

function sum_cost(body){
    return _.sum(body.map(part => BODYPART_COST[part.type || part] ));
}

module.exports = {

    sum_cost: sum_cost,

    has: function has(creep, part){
        let ret;
        if (creep.memory.has === undefined){
            creep.memory.has = {};
        }
        if (creep.memory.has[part] === undefined){
            ret = creep.body.filter(p => p.type === part).length;
            creep.memory.has[part] = ret;
        } else {
            ret = creep.memory.has[part];
        }
        return ret;
    },

    create: function create(role, bodies, memory){
        let costs = bodies.map(sum_cost);
        let body;
        let spawn = Game.spawns.Spawn1;
        for (var i=costs.length - 1; i >= 0; i--){
            if (costs[i] <= spawn.room.energyAvailable){
                body = bodies[i];
                break;
            }
        }
        if (body){
            let ret = spawn.createCreep(body);
            if (typeof ret === 'string'){
                console.log('spawning', ret, body)
                if (memory === undefined){
                    memory = {};
                }
                memory.role = role
                Memory.creeps[ret] = memory;
                return;
            } else if (ret === ERR_BUSY){
                //console.log('spawn busy')
            } else if (ret === ERR_NOT_ENOUGH_ENERGY){
                console.log('not enough energy to spawn', role)
            } else {
                console.log('cant spawn:', ret)
            }
        }
        return -1;
    },
};
