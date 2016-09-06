

claimer = require('claimer')
find = require('find')

function sum_cost(body){
    return _.sum(body.map(part => BODYPART_COST[part.type || part] ));
}

towerless_rooms_table = {
    Spawn1: ['W38S59',
             'W39S58',
             'W37S59',
             'W38S58',
             ],
    Spawn2:
            ['W37S58',
             'W37S56',
             'W38S56',
             'W37S55',
             'W36S57',
             ],
    Spawn3: [],
}

source_rooms_table = {}
Object.assign(source_rooms_table, towerless_rooms_table)

source_rooms_table.Spawn2.splice(
        source_rooms_table.Spawn2.indexOf('W36S57'), 1)

source_rooms_table.Spawn3.push('W37S57')

population_table_default = {
    carrier: 7,
    fixed_carrier: 1,
    worker: 3,
    fixed_worker: 2,
    claimer: 2,
    harvester: 7,
    harvester_work: 36,
    healer: 0,
    attacker: 0,
    fighter: 2,
    visitor: 4,
}

population_table_colony = {
    carrier: 4,
    fixed_carrier: 4,
    worker: 6,
    fixed_worker: 6,
    claimer: 0,
    harvester: 2,
    harvester_work: 12,
    healer: 0,
    attacker: 0,
    fighter: 1,
    visitor: 0,
}

population_table = {
    Spawn1: {},
    Spawn2: {},
    Spawn3: {},
}

Object.assign(population_table.Spawn1, population_table_default)
Object.assign(population_table.Spawn2, population_table_default)
Object.assign(population_table.Spawn3, population_table_colony)

population_table.Spawn1.carrier += 1
// population_table.Spawn2.fixed_carrier += 1
// population_table.Spawn1.attacker += 3

StructureSpawn.prototype.population = function (role){
    return population_table[this.name]
}

MIN_COST_FACTOR = 0.6

StructureSpawn.prototype.create = function (role, bodies, memory){
    let costs = bodies.map(sum_cost);
    let body;
    for (var i=costs.length - 1; i >= 0; i--){
        if (costs[i] <= this.room.energyAvailable){
            body = bodies[i];
            break;
        }
    }
    // TODO: Retestar essa condicao com s.pawns pequenos
    // Talvez aconteça de não poder construir nenhum que
    // passe no >=
    // tambem seria bom aceitar sempre que for o unico < capacity
    if (body &&
            (costs[i] >= MIN_COST_FACTOR * this.room.energyCapacityAvailable ||
            i === (bodies.length - 1))){
        let ret = this.createCreep(body);
        if (typeof ret === 'string'){
            console.log('spawning', ret, body)
            if (memory === undefined){
                memory = {};
            }
            memory.role = role
            Memory.creeps[ret] = memory;
            return ret;
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
    let towerless_rooms = towerless_rooms_table[this.name]
    let source_rooms = source_rooms_table[this.name]
    let spawn_fighter = false;
    
    fighters = find(FIND_MY_CREEPS, {
            filter: c => c.has(ATTACK),
    })

    if (Memory.room_last_seen === undefined) {
        Memory.room_last_seen = {};
    }
    if (Memory.last_fighter === undefined) {
        Memory.last_fighter = {};
    }
    if (Memory.last_claimer === undefined) {
        Memory.last_claimer = {};
    }
    
    for (let i in towerless_rooms){
        let name = towerless_rooms[i]
        let room = Game.rooms[name]
        if (room){
            spawn_fighter = room.find(FIND_HOSTILE_CREEPS).length
            let fighters_ = _.filter(fighters, c => c.memory.spawn === this.name)
            let engaged_fighters = _.filter(fighters_, c => c.memory.target_room == name)
            if (spawn_fighter && (!engaged_fighters.length || engaged_fighters[0] === undefined)){
                if (this.counters().fighter < this.population().fighter){
                    memory_.target_room = name;
                    memory_.done = false;
                } else {
                    let idle_fighters = _.filter(fighters_, c => c.memory.done)
                    if (idle_fighters.length){
                        idle_fighters[0].memory.target_room = name
                        idle_fighters[0].memory.done = false
                    } else {
                        console.log('Fighter quota exceeded, all fighters engaging... Oh shit!')
                    }
                    spawn_fighter = false
                }
                break
            } else {
                spawn_fighter = false
            }
        }
    }

    for (let i in towerless_rooms){
        let name = towerless_rooms[i]
        let room = Game.rooms[name]
        let visitor = _.filter(Game.creeps, c => c.memory.role === 'visitor' &&
                                                 c.memory.target_room === name)
        if (visitor.length){
            let idx = Memory.to_visit[this.name].indexOf(name)
            if (idx !== -1){
                Memory.to_visit[this.name].splice(idx,1)
            }
        }
        if (!room){
            let last_seen = Memory.room_last_seen[name]
            if ((last_seen === undefined || Game.time - last_seen >= 100) &&
                    visitor.length === 0 &&
                    Memory.to_visit[this.name].indexOf(name) === -1){
                Memory.to_visit[this.name].push(name)
            }
        } else {
            Memory.room_last_seen[name] = Game.time
        }
    }
    if (this.name == 'Spawn2' && claimer.spawn()){
        this.population().claimer += 1
        memory_.target_room 
    }
    let role = '';
    if ((this.counters().fighter < this.population().attacker ||
                (spawn_fighter && (Game.time - (Memory.last_fighter[this.name] || 0) > 300))) && 
                this.counters().fighter < this.population().fighter){
        role = 'f'
        ret = this.create('fighter',
                [[TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL],
        ], memory_);
        if (typeof ret === 'string'){
            Memory.last_fighter[this.name] = Game.time
        }

    } else if (this.counters().carrier < 1){
        role = 'c'
        ret = this.create('carrier',
                [[CARRY,CARRY,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
        ], memory_);
    } else if (this.counters().harvester_work < this.population().harvester_work &&
                    this.counters().harvester < this.population().harvester){
        role = 'h';
        ret = this.create('harvester',
                [[WORK,WORK,MOVE],
                 [WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,CARRY],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,CARRY],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,CARRY],
                 [WORK,WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE,CARRY],
        ], memory_);
    } else if (this.counters().carrier < this.population().carrier){
        role = 'c'
        ret = this.create('carrier',
                [[CARRY,CARRY,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
        ], memory_);
    } else if (this.counters().worker < this.population().worker){
        role = 'w'
        ret = this.create('worker',
                [[WORK,WORK,CARRY,MOVE],
                 [WORK,WORK,CARRY,CARRY,MOVE,MOVE],
                 [WORK,WORK,WORK,CARRY,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
        ], memory_);
    } else if (this.counters().claimer < this.population().claimer &&
                (Game.time - (Memory.last_claimer[this.name] || 0) > 280)){
        role = 'cl'
        if (this.name == 'Spawn2' && claimer.spawn()){
            memory_.target_room = 'W36S57'
        }
        ret = this.create('claimer',
                [[CLAIM,MOVE],
                 [CLAIM,CLAIM,MOVE,MOVE],
        ], memory_);
        if (typeof ret === 'string'){
            Memory.last_claimer[this.name] = Game.time
        }
    } else if (this.counters().healer < this.population().healer){
        role = 'he'
        ret = this.create('healer', healer.parts, memory_);
    } else if (this.counters().visitor < this.population().visitor &&
            Memory.to_visit[this.name] && Memory.to_visit[this.name].length && Memory.to_visit[this.name][0]){
        memory_.target_room = Memory.to_visit[this.name][0]
        role = 'v'
        ret = this.create('visitor', [[MOVE],], memory_)
    }
    let recycling = false;
    if (!role && !recycling &&
            this.room.energyAvailable === this.room.energyCapacityAvailable){
        for (let key in Game.creeps){
            let creep = Game.creeps[key];
            if (creep.memory.spawn === this.name){
                let cost = sum_cost(creep.body);
                // console.log(this.name, creep.name, cost)
                if ((cost < 650 &&
                        this.room.energyCapacityAvailable >= 650 &&
                        creep.memory.role === 'harvester') ||
                    (cost < 550 &&
                        this.room.energyCapacityAvailable >= 550 &&
                        creep.memory.role === 'harvester') ||
                    (cost < MIN_COST_FACTOR * this.room.energyCapacityAvailable &&
                        (creep.memory.role === 'worker' ||
                        creep.memory.role === 'carrier'))){
                    creep.memory.recycle = true;
                    break
                }
            }
        }
    }
}


module.exports = {

    sum_cost: sum_cost,
    counters: undefined,
    towerless_rooms_table: towerless_rooms_table,
    source_rooms_table: source_rooms_table,

    update: function(){
        module.exports.counters = counters = {}
        for (let name in Game.spawns){
            counters[name] = {
                worker: 0,
                fixed_worker: 0,
                carrier: 0,
                fixed_carrier: 0,
                harvester: 0,
                fighter: 0,
                claimer: 0,
                healer: 0,
                harvester_work: 0,
                visitor: 0
            }
        }


        for (let id in Game.creeps){
            let creep = Game.creeps[id]
            let spawn = Game.spawns[creep.memory.spawn]
            let counters_ = counters[creep.memory.spawn]
            if (!creep.id){
                continue
            }
            if (creep.memory.recycle){
                continue
            }
            counters_[creep.memory.role] += 1

            if (creep.memory.role === 'harvester'){
                counters_.harvester_work += creep.has(WORK)
            } else if (creep.memory.role === 'carrier'){
                if (counters_.fixed_carrier < spawn.population().fixed_carrier){
                    counters_.fixed_carrier += 1;
                    creep.memory.roaming = false
                } else {
                    creep.memory.roaming = true
                }
            } else if (creep.memory.role === 'worker'){
                if (counters_.fixed_worker < spawn.population().fixed_worker){
                    counters_.fixed_worker += 1;
                    creep.memory.roaming = false
                } else {
                    creep.memory.roaming = true
                }
            }
            /*
            } else if (creep.memory.role === 'visitor'){
            } else if (creep.memory.role === 'fighter'){
            } else if (creep.memory.role === 'healer'){
            } else if (creep.memory.role === 'claimer'){
            }
            */
        }
    }
}

