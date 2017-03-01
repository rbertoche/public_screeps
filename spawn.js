
tables = require('tables')
claimer = require('claimer')
find = require('find')

function sum_cost(body){
    return _.sum(body.map(part => BODYPART_COST[part.type || part] ));
}

population_table_default = {
    carrier: 5,
    fixed_carrier: 1,
    worker: 2,
    fixed_worker: 1,
    claimer: 3,
    harvester: 5,
    harvester_work: 30,
    healer: 0,
    attacker: 0,
    fighter: 3,
    visitor: 6,
}

population_table_colony = {
    carrier: 3,
    fixed_carrier: 1,
    worker: 3,
    fixed_worker: 2,
    claimer: 2,
    harvester: 4,
    harvester_work: 24,
    healer: 0,
    attacker: 0,
    fighter: 2,
    visitor: 4,
}

population_table = {
    Spawn1: {},
    Spawn2: {},
    Spawn3: {},
    Spawn4: {},
    Spawn5: {},
    Spawn7: {},
}

Object.assign(population_table.Spawn1, population_table_default)
Object.assign(population_table.Spawn2, population_table_default)
Object.assign(population_table.Spawn3, population_table_colony)
Object.assign(population_table.Spawn4, population_table_colony)
Object.assign(population_table.Spawn5, population_table_colony)
Object.assign(population_table.Spawn7, population_table_colony)


//population_table.Spawn1.carrier += 1
//population_table.Spawn1.worker += 1
//population_table.Spawn1.fixed_carrier += 1
//population_table.Spawn1.fixed_worker += 1
// population_table.Spawn1.attacker += 31


// todo: condicional pra ativar isso quando lotar os source da sala

//population_table.Spawn3.fixed_carrier += 1
population_table.Spawn3.carrier += 1

//population_table.Spawn5.fixed_worker -= 1
//population_table.Spawn5.worker -= 1

population_table.Spawn5.carrier += 2
population_table.Spawn5.harvester_work += 6
population_table.Spawn5.harvester += 1

population_table.Spawn7.carrier += 1
population_table.Spawn7.fixed_worker = 3
population_table.Spawn7.claimer = 0
population_table.Spawn7.harvester -= 1



const upper_limit_ = [
    0,
    30E3,
    70E3,
    140E3,
    280E3,
    500E3,// lvl 5
    800E3,
    1.5E6,
    2.0E6,
]

spawn_upper_limit = {
    Spawn1: upper_limit_.slice(0),
    Spawn2: upper_limit_.slice(0),
    Spawn3: upper_limit_.slice(0),
    Spawn4: upper_limit_.slice(0),
    Spawn5: upper_limit_.slice(0),
    Spawn7: upper_limit_.slice(0),
}

spawn_upper_limit.Spawn1[8] = 3.5E6
spawn_upper_limit.Spawn2[8] = 3.5E6

spawn_upper_limit.Spawn5[6] = upper_limit_[5]
spawn_upper_limit.Spawn5[7] = upper_limit_[5]

spawn_upper_limit.Spawn4[8] = upper_limit_[7]

room_to_spawn = {
    W39S59: 'Spawn1',
    W37S57: 'Spawn2',
    W36S57: 'Spawn3',
    W35S58: 'Spawn4',
    W34S59: 'Spawn5',
    W34S58: 'Spawn7',
}

spawn_to_spawns = {
    Spawn1: ['Spawn1','Spawn11','Spawn12'],
    Spawn2: ['Spawn2','Spawn21','Spawn6'],
    Spawn3: ['Spawn3','Spawn31'],
    Spawn4: ['Spawn4','Spawn41','Spawn42'],
    Spawn5: ['Spawn5','Spawn51'],
    Spawn7: ['Spawn7'],
}

spawn_to_link = {
    Spawn1: '57b81dcd2aaf9f94430da26f',
    Spawn2: '57c29e26d31a5f1d6767fdde',
    Spawn3: '57d2f495d6eac16a7294db44',
    Spawn4: '57da20f48e9ccf7c4ad84e0f',
    Spawn5: '57f9b3cf5a04bef70bb06b9f',
    Spawn7: '580c0663c4b4241c14787ae8',
}

const MIN_COST_FACTOR = 0.6

lower_ticks_limit = 300
upper_ticks_limit = 1480
maximum_general_e_cost = 100
minimum_general_cost = 1300

function look_for_flag(color, s){
    let flags = s.pos.lookFor(LOOK_FLAGS)
    if (flags.length){
        flags = flags.filter(s => s.color === color)
        if (flags.length){
            return true
        }
    }
    return false
}

look_for_flag = _.curry(look_for_flag)

function is_damaged_(s, rate, check_for_flag){
    //return s && s.structureType !== STRUCTURE_CONTROLLER &&
    return s && (!check_for_flag || !look_for_flag(COLOR_BROWN, s)) &&
            s.structureType !== STRUCTURE_CONTROLLER &&
            s.hits < Math.min(s.hitsMax,
                              s.hitsMax * rate,
                              Memory.upper_limit[s.room.name] * rate)
}


function is_damaged_up(s){
    return is_damaged_(s, 1.02)
}


function is_damaged(s){
    return is_damaged_(s, 1)
}


function is_damaged_half(s){
    return is_damaged_(s, 0.9)
}


function is_damaged_down(s){
    return is_damaged_(s, 0.8)
}


// TODO: Existem 2 my_rooms, esse e o vetor em tables
function my_rooms(s){
    return s && s.pos && tables.my_rooms().indexOf(s.pos.roomName) !== -1;
}


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

DEBUG = false
/*
DEBUG = true
population_table.Spawn5.carrier += 1
*/


StructureSpawn.prototype.create = function (role, bodies, memory){
    let costs = bodies.map(sum_cost);
    // console.log('costs', costs)
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
        let ret
        if (DEBUG){
            ret = 'Gasparzinho'
        } else {
            ret = this.createCreep(body)
        }
        if (typeof ret === 'string'){
            this.counters()[role] += 1
            console.log(this.name, 'spawning', ret, body.length, costs[i], body.map(s => s.slice(0,2)))
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

function renew_filter(spawn, creep){
    return creep.id &&
        creep.memory.spawn === spawn.room_name() &&
        creep.memory.role !== 'harvester' &&
        creep.memory.role !== 'worker' &&
        (creep.memory.roaming === false ||
                creep.room.name === spawn.room.name ) &&
                // (creep.room.name === spawn.room.name &&
                // sum_cost(creep.body) / creep.body.length < maximum_general_e_cost)) &&
        sum_cost(creep.body) > minimum_general_cost &&
        !creep.has(CLAIM) &&
        spawn_filled[spawn.room_name()]
}


Room.prototype.feel_hostile = function()
{
    let level = 0
    return this.find(FIND_HOSTILE_CREEPS).length
}


StructureSpawn.prototype.act = function()
{
    let memory_ = {spawn: this.room_name()};
    let towerless_rooms = tables.towerless_rooms()[this.room_name()]
    let source_rooms = tables.source_rooms()[this.room_name()]
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
            spawn_fighter = room.feel_hostile()
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

    for (let i in tables.visit_rooms()[this.room_name()]){
        let name = tables.visit_rooms()[this.room_name()][i]
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
            if ((last_seen === undefined || Game.time - last_seen >= 30) &&
                    visitor.length === 0 &&
                    Memory.to_visit[this.room_name()].indexOf(name) === -1){
                Memory.to_visit[this.room_name()].push(name)
            }
        } else {
            Memory.room_last_seen[name] = Game.time
        }
    }
    
    carrier_bodies = [[CARRY,CARRY,MOVE],
         [CARRY,CARRY,CARRY,CARRY,MOVE,MOVE],
         [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE],
         [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
         [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
         [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
         [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
         [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
         [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
         [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
         [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
         [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE]
    ]
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
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL],
                 // [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL],
        ], memory_);
        if (typeof ret === 'string'){
            Memory.last_fighter[this.room_name()] = Game.time
        }

    } else if (this.counters().carrier < 1){
        role = 'c'
        ret = this.create('carrier', carrier_bodies, memory_);
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
        ret = this.create('carrier', carrier_bodies, memory_);
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
    } else if (claimer.spawn(this.name) ||
                (this.counters().claimer < this.population().claimer &&
                (Game.time - (Memory.last_claimer[this.room_name()] || 0) > 150))){
        role = 'cl'
        if (claimer.spawn(this.name)){
            memory_.target_room = claimer.target
        }
        if (claimer.spawn()){
            ret = this.create('claimer', [[CLAIM,CLAIM,MOVE,MOVE]], memory_);
        } else {
            ret = this.create('claimer', [[CLAIM,MOVE]], memory_);
        }

        if (typeof ret === 'string'){
            Memory.last_claimer[this.room_name()] = Game.time
            if (claimer.spawn(this.name)){
                Memory.conqueror = ret
            }
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
    auto_recycle = true
    if (!role &&
            this.room.energyAvailable >= this.room.energyCapacityAvailable * 0.95){
        for (let key in Game.creeps){
            let creep = Game.creeps[key];
            if (creep.memory.spawn === this.room_name()){
                let cost = sum_cost(creep.body);
                if (!creep.memory.top_tier &&
                        ((cost < 650 &&
                            this.room.energyCapacityAvailable >= 650 &&
                            creep.memory.role === 'harvester') ||
                        (cost < 550 &&
                            this.room.energyCapacityAvailable >= 550 &&
                            creep.memory.role === 'harvester') ||
                        (auto_recycle &&
                            (cost < MIN_COST_FACTOR * this.room.energyCapacityAvailable) &&
                            (creep.memory.role === 'worker' ||
                             creep.memory.role === 'carrier')))){
                    if (!creep.memory.recycle){
                        // O if apenas evita printar varias vezes a mesma mensagem
                        // A mensagem só parava quando a energia caía, seja pelo spawn de um 
                        // creep pra substituir o que será reciclado ou por algum outro motivo
                        // Caso a energia não caia, não tem problema passar várias vezes por aqui,
                        // exceto pela CPU desperdiçada
                        console.log(this.room_name(), 'recycling', creep.name, creep.body.length, cost)
                        creep.memory.recycle = true;
                    }
                    break
                }
            }
        }
    }
    let to_renew = Memory.renewing[this.name] &&
            Game.getObjectById(Memory.renewing[this.name])

    if (to_renew && 
            (!renew_filter(this, to_renew) || 
                to_renew.ticksToLive >= upper_ticks_limit)){
        to_renew = null
        delete Memory.renewing[this.name]
    }
    if (this.spawning){
        to_renew = null
    } else if (!role && !to_renew){
        for (let key in Game.creeps){
            let creep = Game.creeps[key];
            if (renew_filter(this, creep) &&
                    creep.ticksToLive < lower_ticks_limit &&
                    !creep.renewing()){
                to_renew = creep
                Memory.renewing[this.name] = to_renew.id
                break
            }
        }
    }
    
    if (this.room.energyAvailable < .5 * this.room.energyCapacityAvailable){
        // Do nothing: Not enough energy
    } else if (to_renew){
        // console.log(this.name, 'renewing', to_renew.name)
        if (!to_renew.pos.isNearTo(this)){
            to_renew.moveTo(this)
        }
        this.renewCreep(to_renew)
        if (to_renew.ticksToLive >= upper_ticks_limit){
            delete Memory.renewing[this.name]
        }
    } else if (false){ // Desativado pra evitar sobrecarregar os carriers
                       // que repõem essa energia
        if (Memory.renewing[this.name]){
            delete Memory.renewing[this.name]
        }
        let near = this.pos.findInRange(FIND_MY_CREEPS, 1)
        if (near.length && near[0] !== undefined){
            for (let i in near){
                if (near[i] && sum_cost(near[i].body) > 900){
                    this.renewCreep(near[i])
                }
            }
        }
    }
}


function update(){
    module.exports.sites = {Spawn1:[],Spawn2:[],Spawn3:[],Spawn4:[],Spawn5:[],Spawn7:[]}
    damaged = Object.keys(Game.structures).map(key => Game.structures[key])
    let neutral = find(FIND_STRUCTURES);
    damaged = damaged.concat(neutral.filter(my_rooms));

    if (Memory.unwanted_structures !== undefined){
        damaged = damaged.filter(s => Memory.unwanted_structures.indexOf(s.id) === -1)
    }
    damaged = damaged.filter(is_damaged);
    damaged_half = damaged.filter(is_damaged_half);
    damaged_down = damaged_half.filter(is_damaged_down);

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
    for (let i in tables.my_rooms()){
        let name = tables.my_rooms()[i]
        if (Memory.upper_limit[name] === undefined){
            Memory.upper_limit[name] = upper_limit_[3]
        }
    }

    module.exports.counters = counters = {}
    counters['Spawn7'] = {}
    for (let name in Game.spawns){
        counters[name] = {
            creeps: 0,
            idle: 0,
            idle_delivering: 0,
            idle_workers: 0,
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

    let roaming_carriers = {Spawn1:[],Spawn2:[],Spawn3:[],Spawn4:[],Spawn5:[],Spawn7:[]}
    roaming_carriers.Spawn11 = roaming_carriers.Spawn1
    roaming_carriers.Spawn21 = roaming_carriers.Spawn2
    let roaming_workers = {Spawn1:[],Spawn2:[],Spawn3:[],Spawn4:[],Spawn5:[],Spawn7:[]}
    roaming_workers.Spawn11 = roaming_workers.Spawn1
    roaming_workers.Spawn21 = roaming_workers.Spawn2
    let fixed_carriers = {Spawn1:[],Spawn2:[],Spawn3:[],Spawn4:[],Spawn5:[],Spawn7:[]}
    fixed_carriers.Spawn11 = fixed_carriers.Spawn1
    fixed_carriers.Spawn21 = fixed_carriers.Spawn2
    let fixed_workers = {Spawn1:[],Spawn2:[],Spawn3:[],Spawn4:[],Spawn5:[],Spawn7:[]}
    fixed_workers.Spawn11 = fixed_workers.Spawn1
    fixed_workers.Spawn21 = fixed_workers.Spawn2

    for (let name in Game.creeps){
        let creep = Game.creeps[name]
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

    spawn_filled = {}
    tower_filled = {}
    link_filled = {}
    for (let i in Game.spawns){
        let spawn = Game.spawns[i]
        let room = spawn.room
        if (spawn.room_name() !== spawn.name ||
                !Game.spawns[spawn.name]){
            continue
        }
        if (Memory.to_visit === undefined){
            Memory.to_visit = {}
        }
        if (Memory.room_filled === undefined){
            Memory.room_filled = {}
        }
        if (Memory.to_visit[spawn.name] === undefined){
            Memory.to_visit[spawn.name] = []
        }
        if (Memory.room_filled[spawn.name] === undefined){
            Memory.room_filled[spawn.name] = {}
        }
        spawn_filled[spawn.name] = room.energyAvailable >= 0.65 * room.energyCapacityAvailable;
        tower_filled[spawn.name] = true;
        link_filled[spawn.name] = true;
        let towers = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        })
        if (towers.length && towers[0]){
            for (let i in towers){
                let tower = towers[i]
                if (tower.energy < tower.energyCapacity - 400){
                    tower_filled[spawn.name] = false
                    break
                }
            }
        }
        let link = Game.getObjectById(spawn_to_link[spawn.name])
        if (link && link.energy < 650){
            link_filled[spawn.name] = false;
        }

        room_filled_transition = {}
        room_filled_transition[spawn.name] = (room_filled(spawn.name) && 1 || 0) - (Memory.room_filled[spawn.name] && 1 || 0)
        Memory.room_filled[spawn.name] = room_filled(spawn.name)
        room_filled_transition[spawn.name]

        Memory.upper_limit[room.name] = spawn_upper_limit[spawn.name][room.controller.level];

        let counters_ = counters[spawn.name]
        if (counters_.fixed_carrier < spawn.population().fixed_carrier){
            while(counters_.fixed_carrier < spawn.population().fixed_carrier &&
                    roaming_carriers[spawn.name].length && roaming_carriers[spawn.name][0]){
                counters_.fixed_carrier += 1;
                let creep = roaming_carriers[spawn.name].pop()
                creep.memory.roaming = false
                delete creep.memory.procure
                delete creep.memory.move_
            }
        } else {
            while(counters_.fixed_carrier > spawn.population().fixed_carrier &&
                    fixed_carriers[spawn.name].length && fixed_carriers[spawn.name][0]){
                counters_.fixed_carrier -= 1;
                let creep = fixed_carriers[spawn.name].pop()
                creep.memory.roaming = true
                delete creep.memory.procure
                delete creep.memory.move_
            }
        }


        if (counters_.fixed_worker < spawn.population().fixed_worker){
            while (counters_.fixed_worker < spawn.population().fixed_worker &&
                    roaming_workers[spawn.name].length && roaming_workers[spawn.name][0]){
                counters_.fixed_worker += 1;
                let creep = roaming_workers[spawn.name].pop()
                creep.memory.roaming = false
                delete creep.memory.procure
                delete creep.memory.maintenance
                delete creep.memory.move_
            }
        } else {
            while (counters_.fixed_worker > spawn.population().fixed_worker &&
                    fixed_workers[spawn.name].length && fixed_workers[spawn.name][0]){
                counters_.fixed_worker -= 1;
                let creep = fixed_workers[spawn.name].pop()
                creep.memory.roaming = true
                delete creep.memory.procure
                delete creep.memory.maintenance
                delete creep.memory.move_
            }
        }
    }
}

function report(){
    let elapsed_time = Memory.last_stats && (Date.now() - +Memory.last_stats.date) / 1000.
    if (Game.time % 2000 === 0){
        console.log('generating a new report')
        let filled = {}
        let storage = {}
        let cp = {}
        filled.spawn_filled = Object.assign({}, spawn_filled)
        filled.tower_filled = Object.assign({}, tower_filled)
        filled.link_filled = Object.assign({}, link_filled)
        
        let counters_ = {}
        for (let name in population_table){
            counters_[name] = counters[name]
            storage[name] = Game.spawns[name].room.storage.store[RESOURCE_ENERGY]
            cp[name] = Game.spawns[name].room.controller.progress
        }
        // console.log(sub_2({a:[2]},{a:[1]}).a[0])
        
        Memory.message = summary_stats(counters_, filled, storage, cp)
        
        if (Memory.last_stats === undefined){
            Memory.last_stats = {}
        }
        if (Memory.last_stats.counters === undefined){
            Memory.last_stats.counters = {}
        }
        if (Memory.last_stats.filled === undefined){
            Memory.last_stats.filled = {}
        }
        if (Memory.last_stats.storage === undefined){
            Memory.last_stats.storage = {}
        }
        if (Memory.last_stats.cp === undefined){
            Memory.last_stats.cp = {}
        }
        // message += '\n\nLast:\n' + summary_stats(Memory.last_stats.counters, Memory.last_stats.filled)
        let counters_diff = sub_2(counters_, Memory.last_stats.counters)
        let filled_diff = sub_2(filled, Memory.last_stats.filled)
        let storage_diff = sub(storage, Memory.last_stats.storage)
        let cp_diff = sub(cp, Memory.last_stats.cp)
        Memory.message.push('Diferenças (depois de ' + (Game.time - +Memory.last_stats.time) + ' ticks ou ' +
                    elapsed_time + ' segundos):')
        Memory.message = Memory.message.concat(summary_stats(counters_diff, filled_diff, storage_diff, cp_diff))

        //console.log(message)
        Memory.last_stats.counters = Object.assign({}, counters_)
        Memory.last_stats.filled = Object.assign({}, filled)
        Memory.last_stats.storage = Object.assign({}, storage)
        Memory.last_stats.cp = Object.assign({}, cp)
        Memory.last_stats.time = Game.time
        Memory.last_stats.date = Date.now()
    }
    if (Memory.message === undefined){
        Memory.message = []
    }
    let notify_count = 0
    while (Memory.message.length && notify_count < 20){
        let message = Memory.message.splice(0, 1)
        Game.notify(message)
        console.log(message)
        notify_count++;
    }
}

function sub_2(a, b){
    let ret = {}
    for (let key in a){
        //if (key in a && key in b){
            if (key in b){
                ret[key] = sub(a[key], b[key])
            }
        /* 
        } else {
            console.log('Erro', key, 'ausente')
            console.log(a,b)
            break
        }*/
    }
    return ret
}

function sub(a, b) {
    return _.mapValues(a, function(value,key){
        return +(value) - +(b[key])
    })
}

function summary_stats(counters, filled, storage, cp){
        let TABULATION = 8
        let message = [['','spawn', 'tower','link','storage','cp'].concat(_.keys(counters.Spawn1))
                            .map(to_fixed_size(TABULATION - 1)).join(' ')]
        for (let name in counters){
            let counters_ = counters[name]
            message.push(['S' + name.slice(5,7),
                            +filled.spawn_filled[name],
                            +filled.tower_filled[name],
                            +filled.link_filled[name],
                            storage[name].toPrecision(3),
                            cp[name].toPrecision(3),
                            ].concat(_.values(counters_))
                            .map(to_fixed_size(TABULATION)).join(''))
        }
        return message
}


function room_filled(spawn_name){
    return spawn_filled[spawn_name] &&
           tower_filled[spawn_name] &&
           link_filled[spawn_name]
}


function to_fixed_size(size, s){
    s = _(s).toString()
    return _.padRight(s.slice(0,size), size)
}

to_fixed_size = _.curry(to_fixed_size)

sites = {}
spawn_filled = {}
tower_filled = {}
link_filled = {}
room_filled_transition = {}
damaged = []
damaged_down = []
damaged_half = []

module.exports = {

    look_for_flag: look_for_flag,
    report: report,
    sum_cost: sum_cost,
    counters: undefined,
    sites: sites,
    damaged: () => damaged,
    damaged_half: () => damaged_half,
    damaged_down: () => damaged_down,
    is_damaged_up: is_damaged_up,
    is_damaged: is_damaged,
    is_damaged_half: is_damaged_half,
    is_damaged_down: is_damaged_down,
    room_to_spawn: room_to_spawn,
    spawn_to_spawns: spawn_to_spawns,
    my_rooms: my_rooms,
    room_filled: room_filled,
    spawn_filled: () => spawn_filled,
    tower_filled: () => tower_filled,
    link_filled: () => link_filled,
    room_filled_transition: () => room_filled_transition,
    update: update,
}

