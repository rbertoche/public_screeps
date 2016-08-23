/*
 * creep helper code
 */

function sum_cost(body){
    return _.sum(body.map(part => BODYPART_COST[part.type || part] ));
}

Creep.prototype.has = function (part){
    let ret;
    if (this.memory.has === undefined){
        this.memory.has = {};
    }
    if (this.memory.has[part] === undefined){
        ret = this.body.filter(p => p.type === part).length;
        this.memory.has[part] = ret;
    } else {
        ret = this.memory.has[part];
    }
    return ret;
}

module.exports = {

    sum_cost: sum_cost,

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
