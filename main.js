
memory = require('memory')

STATE_NULL = '';
STATE_DELIVERING = 'delivering';
STATE_COLLECTING = 'collecting';

var container_of_source,
    source_taken,
    source_container;
var damaged, damaged_down, damaged_half, stock;
var recharger_energy, recharger_tower_energy;
var wanted, offered;

const default_path_opts = {
    ignoreCreeps: false,
    maxOps: 1000,
    serializePath: true,
}

function has(creep, part){
    var ret;
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
}


function get_site(creep, filter){
    var sites = _.filter(Game.constructionSites, filter);
    var ret = creep.pos.findClosestByRange(sites);
    if (!ret && sites.length){
        ret = sites[0];
    }
    return ret;
}

function get_damaged(creep){
    return creep.pos.findClosestByRange(damaged);
}
function get_near_damaged(creep){
    var ret = creep.pos.findInRange(damaged,2);
    return ret.length && ret[0];
}

function get_damaged_down(creep){
        /*
        //var keys = Object.keys();
        for (var key in Game.structures){
            var structure = Game.structures[key];
            if ()
        }*/
    var ret = creep.pos.findClosestByRange(damaged_down);
    return ret || damaged_down.length && damaged_down[0];
}

function create(role, bodies){
    var costs = bodies.map((body) => { return _.sum(body.map((part) => { return BODYPART_COST[part]; })); });
    var body;
    var spawn = Game.spawns.Spawn1;
    for (var i=costs.length - 1; i >= 0; i--){
        if (costs[i] <= spawn.room.energyAvailable){
            body = bodies[i];
            break;
        }
    }
    if (body){
        console.log('spawning ' + body)
        var name = spawn.createCreep(body);
        Memory.creeps[name] = { role:role };
        return;
    }
    return -1;
}

function repair(creep){
    if (creep.memory.role === 'worker'){
        var damaged_ = get_near_damaged(creep);
        if (damaged_){
            var ret = creep.repair(damaged_);
            return ret;
        }
    }
    return -1;
}

function goto_damaged(creep){
    if (creep.memory.role === 'worker'){
        var damaged_down_ = get_damaged_down(creep);
        if (damaged_down_){
            if (!creep.pos.isNearTo(damaged_down_)){
                creep.moveTo(damaged_down_, default_path_opts)
            }
            return;
        }
    }
    return -1;
}

function harvest(creep)
{
    if (creep.memory.role === 'harvester'){
        var source = find(FIND_SOURCES_ACTIVE, {
            filter: s => s && !source_taken[s.id] || source_taken[s.id] == creep,
        })
        source = creep.pos.findClosestByPath(source) || source.length && source[0];
        var target = source;
        var container = source && container_of_source[source.id];
        if (source){
            creep.harvest(source);
            if (!creep.pos.isNearTo(source)){
                creep.moveTo(source, default_path_opts);
            } else if (container){
                
                var x = container.pos.x;
                var y = container.pos.y;
                var x_ = ((x + source.pos.x) / 2)
                x = x_.toFixed()
                var y_ = ((y + source.pos.y) / 2)
                y = y_.toFixed();
                var pos = creep.room.getPositionAt(x,y);
                if (creep.room.getPositionAt(x,y).lookFor(LOOK_TERRAIN)[0] === 'wall'){
                    if (y !== y_){
                        y -= 1;
                    } else if (x !== x_){
                        x -= 1;
                    }
                }
                pos = creep.room.getPositionAt(x,y);
                if (!creep.pos.isEqualTo(pos)){
                    creep.moveTo(pos, default_path_opts)
                } else {
                    creep.transfer(container, RESOURCE_ENERGY)
                }
            }
            Memory.source_taken[source.id] = creep.id;
            return;
        } else if (creep.room !== Game.rooms['W38S59']){
            creep.moveTo(new RoomPosition(2,21, 'W38S59', default_path_opts));
            return
            
        } else {
            if (!creep.pos.inRangeTo(Game.flags.Flag1, 4)){
                creep.moveTo(Game.flags.Flag1, default_path_opts);
            }
            console.log('cant find source')
        }
    }
    return -1;
}

function build_near(creep, filter){
    if (creep.memory.role === 'worker'){
        var site = get_site(creep, filter)
        if (site && creep.pos.inRangeTo(site, 2)){
            var ret = creep.build(site);
            return ret;
        }
    }
    return -1;
}

function goto_site(creep, filter){
    var site = get_site(creep, filter)
    if (creep.memory.role === 'worker'){
        if (site){
            if(!creep.pos.isNearTo(site)){
                creep.moveTo(site, default_path_opts);
            }
            return;
        }
    }
    return -1;
}

function has_space(s){
    return s && s.store[RESOURCE_ENERGY] < s.storeCapacity;
}

function deposit(creep)
{
    if (has(creep, CARRY)){
        var stock_ = creep.memory.stock !== undefined && memory.get(creep.memory, 'stock');
        if (creep.memory.stock === undefined || !has_space(stock_)){
            stock_ = stock.filter(has_space);
            stock_ = stock_.filter(s => !s.pos.findInRange(FIND_SOURCES, 2).length);
            var stock__ = creep.pos.findClosestByRange(stock_);
            if (!stock__ && stock_){
                stock__ = stock_[0];
            }
            memory.set(creep.memory, 'stock', stock__);
        }
        if (stock_){
            if (!creep.pos.isNearTo(stock_)){
                creep.moveTo(stock_, default_path_opts);
            } else {
                creep.memory.stock_done = true;
            }
            creep.transfer(stock_, RESOURCE_ENERGY);
            return;
        } else {
            delete creep.memory.stock;
        }
    }
    return -1;
}

function get_available(creep){
    var ret = _.filter(Game.structures, s => s.structureType !== STRUCTURE_TOWER && s.energy < s.energyCapacity );
    return creep.pos.findClosestByRange(ret);
}

function get_tower(creep){
    var ret = _.filter(Game.structures, s => s.structureType === STRUCTURE_TOWER && s.energy < s.energyCapacity );
    return creep.pos.findClosestByRange(ret);
}

function recharge_tower(creep)
{
    if (has(creep, CARRY)){
        var tower = get_tower(creep);
        if (tower && (recharger_tower_energy[tower.id] || 0) < (tower.energyCapacity - tower.energy)){
            if (!creep.pos.isNearTo(tower)){
                creep.moveTo(tower, default_path_opts);
            }
            recharger_tower_energy[tower.id] = +(recharger_tower_energy[tower.id]) + creep.carry[RESOURCE_ENERGY];
            creep.transfer(tower, RESOURCE_ENERGY);
            return;
        }
    }
    return -1;
}

function recharge(creep)
{
    if (has(creep, CARRY)){
        if (recharger_energy < (creep.room.energyCapacityAvailable - creep.room.energyAvailable)){
            var spawn = get_available(creep);
            if (spawn){
                if (!creep.pos.isNearTo(spawn)){
                    creep.moveTo(spawn, default_path_opts);
                }
                recharger_energy += creep.carry[RESOURCE_ENERGY];
                creep.transfer(spawn, RESOURCE_ENERGY);
                return;
            }
        }
    }
    return -1;
}

function pickup(creep){
    if (has(creep, CARRY)){
        var energy = creep.pos.findInRange(FIND_DROPPED_ENERGY, 1);
        if (energy.length){
            creep.pickup(energy[0]);
            return;
        }
    }
    return -1;
}

function procure_filter(s){
    return s && (s.energy || s.store[RESOURCE_ENERGY]) - (wanted[s.id] || 0) > 50;
}

function procure(creep){
    if (has(creep, CARRY)){
        var targets = [];
        var stock_ = [], energy, source_container_, source_container__;
        if (creep.memory.role === 'worker' || (creep.memory.role === 'carrier' &&
                    creep.room.energyAvailable < .8 * creep.room.energyCapacityAvailable )){
            stock_ = stock.filter(procure_filter);
        }
        source_container_ = source_container.filter(procure_filter);
        var storage = source_container_.filter(s => s.structureType == STRUCTURE_STORAGE);
        storage = storage.length && storage[0];
        if (source_container_.length > 1 && storage){
            source_container_.splice(source_container_.indexOf(storage), 1);
        }
        
        energy = find(FIND_DROPPED_ENERGY, {
            filter: procure_filter
        });
        targets = targets.concat(energy, source_container_, stock_)
        var target = creep.pos.findClosestByRange(targets);
        if (!target && targets.length){
            target = targets[0];
        }
        if (target){
            wanted[target.id] = (wanted[target.id] || 0) + (creep.carryCapacity - creep.carry[RESOURCE_ENERGY]);
        }
        
        if (!creep.pos.isNearTo(target)){
            creep.moveTo(target, default_path_opts)
        }
        if (target instanceof Energy){
            creep.pickup(target);
        } else if (target instanceof Structure){
            creep.withdraw(target, RESOURCE_ENERGY);
        } else {
            console.log('error',target);
        }
        return
    }
    return -1;
}

function upgrade(creep, lvl)
{
    lvl = lvl || 11;
    var controller = Game.rooms['W39S59'].controller;
    if (creep.memory.role === 'worker' && controller && 
            (controller.level < lvl ||
                controller.ticksToDowngrade < 1500)){
        if (!creep.pos.isNearTo(controller)){
            //var opts = {}
            //Object.assign(opts, default_path_opts)
            //opts.ignoreCreeps = true;
            //creep.moveTo(5, 16, opts);
            //creep.moveTo(controller, opts);
            creep.moveTo(controller, default_path_opts);
        }
        creep.upgradeController(controller);
        return;
    }
    return -1;
}

function fight(creep){

    var targetRoom = 'W38S59';
    var roomPath = [targetRoom]
    /*
    var targetRoom = 'W36S57';
    var roomPath = ['W38S59',
                    'W37S59',
                    'W37S58',
                    'W37S57',
                    targetRoom]
                    */
    /*
    var targetRoom = 'W39S56';
    var roomPath = ['W40S59',
                    'W40S58',
                    'W40S57',
                    'W40S56',
                    targetRoom]
                    */
    var pos = new RoomPosition(25, 25, targetRoom)
    
    if (creep.pos.roomName !== targetRoom){
        var index = roomPath.indexOf(creep.pos.roomName)
        if (index === -1){
            index = 0;
        } else {
            index += 1;
        }
        creep.moveTo(new RoomPosition(25, 25, roomPath[index]), default_path_opts);
    } else {
        var enemy_structure = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER,
        });
        if (!enemy_structure.length){
            enemy_structure = creep.room.find(FIND_HOSTILE_SPAWNS);
        }
        if (enemy_structure.length){
            var opts = {}
            Object.assign(opts, default_path_opts)
            opts.ignoreDestructibleStructures = true;
            creep.moveTo(enemy_structure[0], opts);
            return
        }
    }
    var enemy = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (enemy){
        creep.attack(enemy)
        if (!creep.pos.isNearTo(enemy)){
            creep.moveTo(enemy, default_path_opts);
        }
    }
}

function tower_act(tower){
    var enemy = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (enemy){
        tower.attack(enemy);
        return
    }
    if (damaged_half.length){
        var damaged_half_ = tower.pos.findClosestByRange(damaged_half);
        if (damaged_half_){
            tower.repair(damaged_half_);
            return;
        }
    }
}

function idle(creep){
    flag = Game.flags.Flag1;
    if (flag && !creep.pos.inRangeTo(flag,4)){
        creep.moveTo(flag, default_path_opts);
    }
    return;
}

const upper_limits = [
    60E3,
    60E3,
    60E3,
    90E3,
    90E3,
    150E3,
    300E3,
    600E3,
]
if (Memory.upper_limit === undefined){
    Memory.upper_limit = upper_limits[0];
}
function is_damaged(s, rate){
    if (rate === undefined){
        rate = 1;
    }
    return s && s.structureType !== STRUCTURE_CONTROLLER &&
            s.hits < (s.hitsMax * rate) && 
            s.hits < (Memory.upper_limit * rate);
}

function is_stock(s){
    return (s.structureType === STRUCTURE_CONTAINER ||
            s.structureType === STRUCTURE_STORAGE )&&
            s.storeCapacity;
}

function near_build_flag(s) { 
    return s.room && s.pos.findInRange(FIND_FLAGS, 4, {
        filter: (flag) => { return flag.color === COLOR_YELLOW; }
    }).length
}

function find(type, opts){
    ret = [];
    var keys = Object.keys(Game.rooms);
    for (var i in keys){
        var key = keys[i];
        if (Game.rooms[key]){
            ret = ret.concat(Game.rooms[key].find(type, opts));
        }
    }
    return ret;
}

module.exports.loop = function () {
    
    recharger_energy = 0;
    wanted = {};
    offered = {};
    recharger_tower_energy = {};
    damaged = Object.keys(Game.structures).map(key => Game.structures[key])
    var neutral = find(FIND_STRUCTURES);
    damaged = damaged.concat(neutral);
    damaged = damaged.filter(s => s.pos.roomName === 'W39S59' || s.pos.roomName === 'W38S59');
    stock = find(FIND_STRUCTURES, {
        filter: is_stock,
    });
    
    var room = Game.rooms['W39S59'];
    if (Object.keys(Game.constructionSites).length == 0){
        Memory.upper_limit = upper_limits[room.controller.level];
    }
    damaged = damaged.filter(s => is_damaged(s));
    damaged_half = damaged.filter(s => is_damaged(s, .9));
    damaged_down = damaged.filter(s => is_damaged(s, .8));
    
    var towers = _.filter(Game.structures, s => s.structureType === STRUCTURE_TOWER);
    for (var key in towers) {
        tower_act(towers[key]);
    }

    source_taken = memory.get(Memory,'source_taken');
    if (!source_taken){
        source_taken = {}
        Memory.source_taken = source_taken;
    } else {
        var keys = Object.keys(source_taken);
        for (var key in keys){
            if (source_taken[key] == null){
                delete source_taken[key];
            }
        }
        memory.set(Memory,'source_taken', source_taken);
    }
    container_of_source = {};
    source_container = [];
    var sources = find(FIND_SOURCES);
    for (var key in sources){
        var source = sources[key];
        var container = source.pos.findInRange(FIND_STRUCTURES, 2,{
            filter: is_stock
        });
        if (container.length){
            source_container.push(container[0])
            container_of_source[source.id] = container[0];
        }
    }
    

    room.createConstructionSite(24, 4, STRUCTURE_EXTENSION);
    room.createConstructionSite(24, 10, STRUCTURE_EXTENSION);
    room.createConstructionSite(24, 8, STRUCTURE_EXTENSION);
    room.createConstructionSite(24, 6, STRUCTURE_EXTENSION);
    room.createConstructionSite(23, 7, STRUCTURE_EXTENSION);
    room.createConstructionSite(23, 9, STRUCTURE_EXTENSION);
    room.createConstructionSite(23, 5, STRUCTURE_EXTENSION);
    room.createConstructionSite(22, 4, STRUCTURE_EXTENSION);
    room.createConstructionSite(22, 10, STRUCTURE_EXTENSION);
    room.createConstructionSite(22, 8, STRUCTURE_EXTENSION);
    room.createConstructionSite(22, 6, STRUCTURE_EXTENSION);
    room.createConstructionSite(21, 7, STRUCTURE_EXTENSION);
    room.createConstructionSite(21, 9, STRUCTURE_EXTENSION);
    room.createConstructionSite(21, 5, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 4, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 8, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 10, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 6, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 7, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 9, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 5, STRUCTURE_EXTENSION);
    
    var workers = 0,
        carriers = 0,
        harvesters = 0,
        fighters = 0,
        claimers = 0,
        harvester_work = 0
        ;
        
    for (var key in  Game.creeps){
        var creep = Game.creeps[key];
        var state = creep.memory.state;
        
        if (creep.memory.recycle){
            if (!creep.pos.isNearTo(Game.spawns.Spawn1)){
                creep.moveTo(Game.spawns.Spawn1);
            }
            Game.spawns.Spawn1.recycleCreep(creep);
            continue
        }
        
        if (creep.memory.role == 'worker'){
            workers += 1;
        } else if (creep.memory.role == 'carrier'){
            carriers += 1;
        } else if (creep.memory.role == 'harvester'){
            harvesters += 1;
            harvester_work += has(creep,WORK);
        } else if (creep.memory.role == 'fighter'){
            fighters += 1;
        }
        /*
        if (has(creep,WORK) && has(creep,CARRY)){
            workers += 1;
        } else if (has(creep,CARRY)){
            carriers += 1;
        } else if (has(creep,WORK)){
            harvesters += 1;
            harvester_work += has(creep,WORK);
        }*/
        
        if (typeof creep.memory.state !== 'string'){
            creep.memory.state = STATE_NULL;
        }
        if (creep.memory.role === 'carrier' ||
            creep.memory.role === 'worker' ){
            if ((!state || state === STATE_COLLECTING) && 
                    creep.carry[RESOURCE_ENERGY] > (.9 * creep.carryCapacity)){
                state = STATE_DELIVERING;
                memory.set(creep.memory, 'state', state)
            } else if (state === STATE_DELIVERING && 
                        (!creep.carry[RESOURCE_ENERGY] || 
                            (creep.memory.stock_done && 
                                creep.carry[RESOURCE_ENERGY] * 2 < creep.carryCapacity))){
                delete creep.memory.stock_done;
                state = STATE_COLLECTING;
                memory.set(creep.memory, 'state', state)
            }
        } else {
            state = STATE_COLLECTING;
        }
        if (creep.memory.role === 'fighter' ){
            fight(creep);
            continue;
        } else if (creep.memory.role === 'claimer' ){
            claim(creep);
            continue;
        }
        
        pickup(creep);
        
        
        var ret = -1;
        if (!state || state === STATE_COLLECTING ){
            if (ret){
                ret = harvest(creep);
            }
            if (ret){
                ret = procure(creep);
            }
            if (ret){
                console.log('' + creep.name + ' in idle collecting')
                ret = idle(creep);
            }
        } else if ( state === STATE_DELIVERING ){
            
            if (ret){
                ret = upgrade(creep, 2);
            }
            if (ret){
                ret = goto_site(creep, near_build_flag);
            }
            if (ret){
                ret = goto_damaged(creep);
            }
            if (ret){
                ret = goto_site(creep);
            }
            ret &= build_near(creep);
            ret &= repair(creep);
            if (ret){
                ret = upgrade(creep);
            }
            if (ret){
                ret = recharge(creep);
            }
            if (ret){
                ret = recharge_tower(creep);
            }
            if (ret){
                ret = deposit(creep);
            }
            if (ret){
                console.log('' + creep.name + ' in idle delivering')
            }
        }
    }
    var role = '';
    if (harvester_work < 15 && harvesters < 4){
        role = 'h';
        ret = create('harvester',
                [[WORK,WORK,MOVE],
                 [WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,CARRY],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,CARRY],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,CARRY],
        ]);
    } else if (carriers < 4){
        role = 'c'
        ret = create('carrier',
                [[CARRY,CARRY,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
        ]);
    } else if (workers < 5){
        role = 'w'
        ret = create('worker',
                [[WORK,WORK,CARRY,MOVE],
                 [WORK,WORK,CARRY,CARRY,MOVE,MOVE],
                 [WORK,WORK,WORK,CARRY,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
        ]);
    } else if (fighters < 0){
        role = 'f'
        ret = create('fighter',
                [[TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL],
        ]);
    } else if (claimers < 0){
        role = 'cl'
        ret = create('claimer',
                [[CLAIM,MOVE],
                 [CLAIM,CLAIM,MOVE,MOVE],
        ]);
    }
    console.log('' + Object.keys(Game.creeps).length +
                (role && (' s' + role) || '   ') + 
                ' w' + workers +
                ' c' + carriers + 
                //' h' + harvesters +
                ' hw' + harvester_work +
                ' f' + fighters +
                ' ' + Game.cpu.getUsed().toFixed(2));
}