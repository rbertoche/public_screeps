

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
             'W35S58',
             ],
    Spawn3: ['W36S58',
             'W37S59',
             'W37S58',
            ],
    Spawn4: [],
}

source_rooms_table = {}
Object.assign(source_rooms_table, towerless_rooms_table)
source_rooms_table.Spawn1.push('W39S59')
source_rooms_table.Spawn2.push('W37S57')
source_rooms_table.Spawn3.push('W36S57')
source_rooms_table.Spawn4.push('W35S58')

procure_rooms_table = {}
Object.assign(procure_rooms_table, towerless_rooms_table)
procure_rooms_table.Spawn2.splice(procure_rooms_table.Spawn2.indexOf('W35S58'), 1)
procure_rooms_table.Spawn2.splice(source_rooms_table.Spawn2.indexOf('W35S58'), 1)
procure_rooms_table.Spawn4.push('W36S58')

population_table_default = {
    carrier: 7,
    fixed_carrier: 1,
    worker: 3,
    fixed_worker: 2,
    claimer: 3,
    harvester: 6,
    harvester_work: 36,
    healer: 0,
    attacker: 0,
    fighter: 2,
    visitor: 4,
}

population_table_colony = {
    carrier: 4,
    fixed_carrier: 1,
    worker: 4,
    fixed_worker: 2,
    claimer: 1,
    harvester: 3,
    harvester_work: 18,
    healer: 0,
    attacker: 0,
    fighter: 1,
    visitor: 0,
}
population_table_colony_1 = {
    carrier: 4,
    fixed_carrier: 2,
    worker: 5,
    fixed_worker: 5,
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
    Spawn4: {},
}

Object.assign(population_table.Spawn1, population_table_default)
Object.assign(population_table.Spawn2, population_table_default)
Object.assign(population_table.Spawn3, population_table_colony)
Object.assign(population_table.Spawn4, population_table_colony_1)

population_table.Spawn1.carrier += 2
// population_table.Spawn2.fixed_carrier += 1
// population_table.Spawn1.attacker += 3


const upper_limits = [
    4000,
    30E3,
    70E3,
    140E3,
    280E3,
    500E3,// lvl 6
    800E3,
    1.5E4,
]

StructureSpawn.prototype.population = function (role){
    return population_table[this.room_name()]
}

StructureSpawn.prototype.room_name = function (){
    if (this.name in population_table){
        return this.name
    } else {
        return room_to_spawn[this.room.name]
    }
}

MIN_COST_FACTOR = 0.6

StructureSpawn.prototype.create = function (role, bodies, memory){
    let costs = bodies.map(sum_cost);
    let body;
    if (memory === undefined){
        memory = {};
    }
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
            (costs[i] > MIN_COST_FACTOR * this.room.energyCapacityAvailable ||
                i === bodies.length - 1 ||
                this.counters()[role] === 0)){
        if (i === (bodies.length - 1)){
            memory.top_tier = true
        }
        let ret = this.createCreep(body)
        if (typeof ret === 'string'){
            this.counters()[role] += 1
            console.log('spawning', ret, body)
            memory.role = role
            Memory.creeps[ret] = memory
            return ret
        } else if (ret === ERR_BUSY){
            //console.log('spawn busy')
        } else if (ret === ERR_NOT_ENOUGH_ENERGY){
            console.log('not enough energy to spawn', role)
        } else {
            console.log('cant spawn:', ret)
        }
    }
    return -1
}

StructureSpawn.prototype.counters = function(){
    return counters[this.room_name()]
}

StructureSpawn.prototype.act = function()
{
    let memory_ = {spawn: this.room_name()};
    let towerless_rooms = towerless_rooms_table[this.room_name()]
    let source_rooms = source_rooms_table[this.room_name()]
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
            let fighters_ = _.filter(fighters, c => c.memory.spawn === this.room_name())
            let engaged_fighters = _.filter(fighters_, c => c.memory.target_room === name)
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
            let idx = Memory.to_visit[this.room_name()].indexOf(name)
            if (idx !== -1){
                Memory.to_visit[this.room_name()].splice(idx,1)
            }
        }
        if (!room){
            let last_seen = Memory.room_last_seen[name]
            if ((last_seen === undefined || Game.time - last_seen >= 100) &&
                    visitor.length === 0 &&
                    Memory.to_visit[this.room_name()].indexOf(name) === -1){
                Memory.to_visit[this.room_name()].push(name)
            }
        } else {
            Memory.room_last_seen[name] = Game.time
        }
    }
    if (this.room_name() === 'Spawn2' && claimer.spawn()){
        this.population().claimer += 1
        memory_.target_room = claimer.target_room
    }
    let role = '';
    if ((this.counters().fighter < this.population().attacker ||
                (spawn_fighter && (Game.time - (Memory.last_fighter[this.room_name()] || 0) > 300))) && 
                this.counters().fighter < this.population().fighter){
        role = 'f'
        ret = this.create('fighter',
                [[TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL],
        ], memory_);
        if (typeof ret === 'string'){
            Memory.last_fighter[this.room_name()] = Game.time
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
                (Game.time - (Memory.last_claimer[this.room_name()] || 0) > 220)){
        role = 'cl'
        /* WTF?
        if (this.room_name() === 'Spawn2' && claimer.spawn()){
            memory_.target_room = 'W36S57'
        } */
        ret = this.create('claimer',
                [[CLAIM,MOVE],
                 [CLAIM,CLAIM,MOVE,MOVE],
        ], memory_);
        if (typeof ret === 'string'){
            Memory.last_claimer[this.room_name()] = Game.time
        }
    } else if (this.counters().healer < this.population().healer){
        role = 'he'
        ret = this.create('healer', healer.parts, memory_);
    } else if (this.counters().visitor < this.population().visitor &&
            Memory.to_visit[this.room_name()] && Memory.to_visit[this.room_name()].length && Memory.to_visit[this.room_name()][0]){
        memory_.target_room = Memory.to_visit[this.room_name()][0]
        role = 'v'
        ret = this.create('visitor', [[MOVE],], memory_)
    }
    let recycling = false;
    if (!role && !recycling &&
            this.room.energyAvailable === this.room.energyCapacityAvailable){
        for (let key in Game.creeps){
            let creep = Game.creeps[key];
            if (creep.memory.spawn === this.room_name()){
                let cost = sum_cost(creep.body);
                // console.log(this.room_name(), creep.name, cost)
                if (!creep.memory.top_tier &&
                    (cost < 650 &&
                        this.room.energyCapacityAvailable >= 650 &&
                        creep.memory.role === 'harvester') ||
                    (cost < 550 &&
                        this.room.energyCapacityAvailable >= 550 &&
                        creep.memory.role === 'harvester')){
                    // (cost < MIN_COST_FACTOR * this.room.energyCapacityAvailable &&
                    //     (creep.memory.role === 'worker' ||
                    //     creep.memory.role === 'carrier'))){
                    creep.memory.recycle = true;
                    break
                }
            }
        }
    }
}

function is_damaged_(s, rate){
    return s && s.structureType !== STRUCTURE_CONTROLLER &&
            s.hits < (s.hitsMax * rate) &&
            s.hits < (Memory.upper_limit[s.room.name] * rate);
}

function is_damaged(s){
    return is_damaged_(s, 1)
}

function is_damaged_half(s){
    return is_damaged_(s, 0.9)
}

function is_damaged_down(s){
    return is_damaged_(s, 0.7)
}

room_to_spawn = {
    W39S59: 'Spawn1',
    W37S57: 'Spawn2',
    W36S57: 'Spawn3',
    W35S58: 'Spawn4',
}

const _my_rooms = [
    'W39S59',
    'W36S57',
    'W38S59',
    'W39S58',
    'W37S58',
    'W37S57',
    'W37S56',
    'W37S55',
    'W38S56',
    'W38S58',
    'W37S59',
    'W40S58',
    'W40S59',
    'W36S58',
    'W35S58',
    ]

function my_rooms(s){
    return s && s.pos && _my_rooms.indexOf(s.pos.roomName) !== -1;
}


function update(){
    module.exports.sites = {Spawn1:[],Spawn2:[],Spawn3:[],Spawn4:[]}
    let damaged = Object.keys(Game.structures).map(key => Game.structures[key])
    let neutral = find(FIND_STRUCTURES);
    damaged = damaged.concat(neutral.filter(my_rooms));

    if (Memory.unwanted_structures !== undefined){
        damaged = damaged.filter(s => Memory.unwanted_structures.indexOf(s.id) === -1)
    }
    module.exports.damaged = damaged.filter(is_damaged);
    module.exports.damaged_half = module.exports.damaged.filter(is_damaged_half);
    module.exports.damaged_down = module.exports.damaged_half.filter(is_damaged_down);

    for (let key in Game.constructionSites){
        let site = Game.constructionSites[key]
        if (site.room && site.room.name in room_to_spawn){
            module.exports.sites[room_to_spawn[site.room.name]].push(site)
        }
    }

    for (let site in damaged_down){
        if (site.room && site.room.name in room_to_spawn){
            module.exports.sites[room_to_spawn[site.room.name]].push(site)
        }
    }

    if (Memory.upper_limit === undefined){
        Memory.upper_limit = {};
    }
    for (let i in _my_rooms){
        let name = _my_rooms[i]
        if (Memory.upper_limit[name] === undefined){
            Memory.upper_limit[name] = upper_limits[3]
        }
    }

    module.exports.counters = counters = {}
    for (let name in Game.spawns){
        counters[name] = {
            creeps: 0,
            idle: 0,
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

    let roaming_carriers = {Spawn1:[],Spawn2:[],Spawn3:[],Spawn4:[]}
    roaming_carriers.Spawn11 = roaming_carriers.Spawn1
    roaming_carriers.Spawn21 = roaming_carriers.Spawn2
    let roaming_workers = {Spawn1:[],Spawn2:[],Spawn3:[],Spawn4:[]}
    roaming_workers.Spawn11 = roaming_workers.Spawn1
    roaming_workers.Spawn21 = roaming_workers.Spawn2
    let fixed_carriers = {Spawn1:[],Spawn2:[],Spawn3:[],Spawn4:[]}
    fixed_carriers.Spawn11 = fixed_carriers.Spawn1
    fixed_carriers.Spawn21 = fixed_carriers.Spawn2
    let fixed_workers = {Spawn1:[],Spawn2:[],Spawn3:[],Spawn4:[]}
    fixed_workers.Spawn11 = fixed_workers.Spawn1
    fixed_workers.Spawn21 = fixed_workers.Spawn2

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
        counters_['creeps'] += 1

        if (creep.memory.role === 'harvester'){
            counters_.harvester_work += creep.has(WORK)
        } else if (creep.memory.role === 'carrier'){
            if (!creep.memory.roaming){
                counters_.fixed_carrier += 1;
                fixed_carriers[creep.memory.spawn].push(creep)
            } else {
                roaming_carriers[creep.memory.spawn].push(creep)
            }
        } else if (creep.memory.role === 'worker'){
            if (!creep.memory.roaming){
                counters_.fixed_worker += 1;
                fixed_workers[creep.memory.spawn].push(creep)
            } else {
                roaming_workers[creep.memory.spawn].push(creep)
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
    
    for (let i in Game.spawns){
        let spawn = Game.spawns[i]
        let room = spawn.room
        
        Memory.upper_limit[room.name] = upper_limits[room.controller.level];
        
        let counters_ = counters[spawn.name]
        while(counters_.fixed_carrier > spawn.population().fixed_carrier &&
                fixed_carriers[spawn.name].length && fixed_carriers[spawn.name][0]){
            counters_.fixed_carrier -= 1;
            let creep = fixed_carriers[spawn.name].pop()
            creep.memory.roaming = true
            delete creep.memory.procure
            delete creep.memory.move_
        }

        while (counters_.fixed_worker > spawn.population().fixed_worker &&
                fixed_workers[spawn.name].length && fixed_workers[spawn.name][0]){
            counters_.fixed_worker -= 1;
            let creep = fixed_workers[spawn.name].pop()
            creep.memory.roaming = true
            delete creep.memory.procure
            delete creep.memory.maintenance
            delete creep.memory.move_
        }

        while(counters_.fixed_carrier < spawn.population().fixed_carrier &&
                roaming_carriers[spawn.name].length && roaming_carriers[spawn.name][0]){
            counters_.fixed_carrier += 1;
            let creep = roaming_carriers[spawn.name].pop()
            creep.memory.roaming = false
            delete creep.memory.procure
            delete creep.memory.move_
        }

        while (counters_.fixed_worker < spawn.population().fixed_worker &&
                roaming_workers[spawn.name].length && roaming_workers[spawn.name][0]){
            counters_.fixed_worker += 1;
            let creep = roaming_workers[spawn.name].pop()
            creep.memory.roaming = false
            delete creep.memory.procure
            delete creep.memory.maintenance
            delete creep.memory.move_
        }
    }
}


sites = {}
damaged = []
damaged_down = []
damaged_half = []

module.exports = {

    sum_cost: sum_cost,
    counters: undefined,
    towerless_rooms_table: towerless_rooms_table,
    source_rooms_table: source_rooms_table,
    procure_rooms_table: procure_rooms_table,
    sites: sites,
    damaged: damaged,
    damaged_down: damaged_down,
    is_damaged: is_damaged,
    is_damaged_half: is_damaged_half,
    is_damaged_down: is_damaged_down,
    room_to_spawn: room_to_spawn,
    my_rooms: my_rooms,

    update: update,
}

