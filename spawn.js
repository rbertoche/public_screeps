


var counters;

function sum_cost(body){
    return _.sum(body.map(part => BODYPART_COST[part.type || part] ));
}

towerless_rooms_table = {
    W38S59: ['W38S59',
             'W37S59',
             ],
    W37S57:
            ['W37S58',
             'W37S57',
             ]
}

StructureSpawn.prototype.create = function (role, bodies, memory){
    let costs = bodies.map(sum_cost);
    let body;
    for (var i=costs.length - 1; i >= 0; i--){
        if (costs[i] <= this.room.energyAvailable){
            body = bodies[i];
            break;
        }
    }
    if (body){
        let ret = this.createCreep(body);
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
}

StructureSpawn.prototype.counters = function(){
    return counters[this.name]
}

StructureSpawn.prototype.act = function()
{
    let memory_ = {spawn: this.name};
    let towerless_rooms = this.pos.roomName
    let hostile_at;

    for (let i in towerless_rooms){
      let name = towerless_rooms[i]
      let room = Game.rooms[name]
      hostile_at = room && room.find(FIND_HOSTILE_CREEPS).length
      if (hostile_at){
          memory_.target_room = name;
          break
      }
    }
    fighters_quota = 0 + (hostile_at || 0)
    let role = '';
    if (this.counters().fighter < fighters_quota){
        role = 'f'
        ret = this.create('fighter',
                [[TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL],
        ], memory_);

    } else if (this.counters().carrier < 4){
        role = 'c'
        ret = this.create('carrier',
                [[CARRY,CARRY,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
        ], memory_);
    } else if (this.counters().harvester_work < 10 && this.counters().harvester < 5){
        role = 'h';
        ret = this.create('harvester',
                [[WORK,WORK,MOVE],
                 [WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,CARRY],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,CARRY],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,CARRY],
        ], memory_);
    } else if (this.counters().worker < 5){
        role = 'w'
        ret = this.create('worker',
                [[WORK,WORK,CARRY,MOVE],
                 [WORK,WORK,CARRY,CARRY,MOVE,MOVE],
                 [WORK,WORK,WORK,CARRY,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
        ], memory_);
    } else if (this.counters().claimer < 0){
        role = 'cl'
        ret = this.create('claimer',
                [[CLAIM,MOVE],
                 [CLAIM,CLAIM,MOVE,MOVE],
        ], memory_);
    } else if (this.counters().healer < 0){
        role = 'he'
        ret = this.create('healer', healer.parts, memory_);
    }
    let recycling = false;
    if (!role && !recycling &&
            this.room.energyAvailable === this.room.energyCapacityAvailable){
        for (let key in Game.creeps){
            let creep = Game.creeps[key];
            let cost = sum_cost(creep.body);
            if (cost < 500 &&
                    (creep.memory.role === 'worker' ||
                    creep.memory.role === 'carrier' ||
                    creep.memory.role === 'harvester')){
                creep.memory.recycle = true;
                break
            }
        }
    }
}


module.exports = {

    sum_cost: sum_cost,
    counters: undefined,

    update: function(){
        module.exports.counters = counters = {}
        for (let name in Game.spawns){
            counters[name] = {
                worker: 0,
                carrier: 0,
                roaming_carrier: 0,
                harvester: 0,
                fighter: 0,
                claimer: 0,
                healer: 0,
                harvester_work: 0
            }
        }


        for (let id in Game.creeps){
            let creep = Game.creeps[id]
            let spawn_name = creep.memory.spawn
            if (spawn_name !== 'Spawn1' && spawn_name !== 'Spawn2'){
                spawn_name = 'Spawn1'
                creep.memory.spawn = spawn_name
            }
            if (creep.memory.roaming === undefined){
                if (counters[spawn_name].roaming_carrier < 3){
                    counters[spawn_name].roaming_carrier += 1;
                    creep.memory.roaming = true
                } else {
                    creep.memory.roaming = false
                }
            }
            counters[spawn_name][creep.memory.role] += 1

            if (creep.memory.role === 'harvester'){
                counters[spawn_name].harvester_work += creep.has(WORK)
            }
            /*
            } else if (creep.memory.role === 'worker'){
            } else if (creep.memory.role === 'carrier'){
            } else if (creep.memory.role === 'fighter'){
            } else if (creep.memory.role === 'healer'){
            } else if (creep.memory.role === 'claimer'){
            }
            */
        }
    }
}
