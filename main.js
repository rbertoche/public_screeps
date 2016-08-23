
memory = require('memory')
find = require('find')
healer = require('healer')
claimer = require('claimer')
creep_ = require('creep')

STATE_NULL = '';
STATE_DELIVERING = 'delivering';
STATE_COLLECTING = 'collecting';

var container_of_source,
    source_work_count,
    maintenance_count,
    source_container;
var damaged, damaged_down, damaged_half, stock;
var recharger_energy, recharger_tower_energy;
var spawn_filled, fillers;
var wanted, offered;
var nearFlag;
var fighters_quota;
var energy


const default_path_opts = {
    ignoreCreeps: false,
    maxOps: 4000,
    serializePath: true,
}

function get_site(creep, filter){
    let sites = _.filter(Game.constructionSites, filter);
    let ret = creep.pos.findClosestByRange(sites);
    if (!ret && sites.length){
        ret = sites[0];
    }
    return ret;
}

function get_damaged(creep){
    return creep.pos.findClosestByRange(damaged);
}
function get_near_damaged(creep){
    let ret = creep.pos.findInRange(damaged,2);
    return ret.length && ret[0];
}

function get_damaged_down(creep){
        /*
        //var keys = Object.keys();
        for (let key in Game.structures){
            let structure = Game.structures[key];
            if ()
        }*/
    let ret = creep.pos.findClosestByRange(damaged_down);
    return ret || damaged_down.length && damaged_down[0];
}

function repair_near(creep){
    if (creep.memory.role === 'worker'){
        let damaged_ = get_near_damaged(creep);
        if (damaged_){
            let ret = creep.repair(damaged_);
            return ret;
        }
    }
    return -1;
}

function goto_damaged(creep){
    if (creep.memory.role === 'worker' && maintenance_count < 2){
        let damaged_down_ = get_damaged_down(creep);
        if (damaged_down_){
            if (!creep.pos.isNearTo(damaged_down_)){
                creep.moveTo(damaged_down_, default_path_opts)
            }
            maintenance_count += 1;
            return;
        }
    }
    return -1;
}


function source_filter(creep){
    return s => s && my_rooms(s) && ((source_work_count[s.id] || 0) + creep_.has(creep, WORK) <= 5);
}

function harvest(creep)
{
    if (creep.memory.role === 'harvester'){
        let source;
        /*
        let taken = _.filter(source_work_count, s => s === creep);
        if (taken.length){
            source = creep.pos.findClosestByPath(taken)  || taken.length && taken[0];
        } else {

        }
        */
        source = find(FIND_SOURCES, {
                filter: source_filter(creep),
            })
        source = creep.pos.findClosestByPath(source) || source.length && source[0];
        let target = source;
        let container = source && container_of_source[source.id];

        if (source){
            creep.harvest(source);
            let working = false;
            if (creep_.has(creep, CARRY)){
                let damaged_ = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                            filter: s => is_stock(s) && (s.hits < s.hitsMax),
                });
                damaged_ = damaged_.concat(creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 2))
                if (damaged_.length && creep.carry[RESOURCE_ENERGY] >= 50){
                    if (damaged_[0].progressTotal){
                        creep.build(damaged_[0])
                    } else {
                        creep.repair(damaged_[0], RESOURCE_ENERGY);
                    }
                    working = true;
                }
            }
            let pos
            if (container){
                let x = container.pos.x;
                let y = container.pos.y;
                let x_ = ((x + source.pos.x) / 2) - 0.5
                x = x_.toFixed()
                let y_ = ((y + source.pos.y) / 2) - 0.5
                y = y_.toFixed()
                pos = source.room.getPositionAt(x,y);
                if (source.room.getPositionAt(x,y).lookFor(
                                LOOK_TERRAIN)[0] === 'wall'){
                    if (x == source.pos.x){
                        x = container.pos.x;
                    } else if (y == source.pos.y){
                        y = container.pos.y;
                    } else if (x == container.pos.x){
                        x = source.pos.x;
                    } else if (y == container.pos.y){
                        y = source.pos.y;
                    }
                }
                pos = source.room.getPositionAt(x,y);
                if (!working){
                    creep.transfer(container, RESOURCE_ENERGY);
                }
            } else {
                pos = source.pos
            }
            if (!creep.pos.isEqualTo(pos)){
                    creep.moveTo(pos, default_path_opts);
            }
            source_work_count[source.id] = (source_work_count[source.id] || 0) + creep_.has(creep, WORK);
            return;
        } else if (Game.rooms['W38S59'] === undefined){
            creep.moveTo(new RoomPosition(2,21, 'W38S59', default_path_opts));
            return
        } else if (Game.rooms['W37S59'] === undefined){
            creep.moveTo(new RoomPosition(2,13, 'W37S59', default_path_opts));
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
        let site = get_site(creep, filter)
        if (site && creep.pos.inRangeTo(site, 2)){
            let ret = creep.build(site);
            return ret;
        }
    }
    return -1;
}

function goto_site(creep, filter){
    let site = get_site(creep, filter)
    if (creep.memory.role === 'worker'){
        if (site){
            if(!creep.pos.isNearTo(site)){
                creep.moveTo(site, default_path_opts);
            }
            maintenance_count += 1;
            return;
        }
    }
    return -1;
}

function has_space(s){
    return s && s.store[RESOURCE_ENERGY] + (offered[s.id] || 0) - (wanted[s.id] || 0) < s.storeCapacity;
}

function stock_filter(to_storage){
    return s => has_space(s) && (!s.pos.findInRange(FIND_SOURCES, 2).length ||
                                        (to_storage && s.structureType === STRUCTURE_STORAGE))
}

function deposit(creep, to_storage)
{
    if (creep_.has(creep, CARRY)){
        if(!spawn_filled){
            console.log('oops, spawn not filled ' + creep.name)
            return -1
        }

        let stock_ = creep.memory.stock !== undefined && memory.get(creep.memory, 'stock');
        if (creep.memory.stock === undefined || !stock_filter(to_storage)(stock_)){
            stock_ = stock.filter(stock_filter(to_storage));
            //if (!to_storage){
            stock_ = stock_.filter(s => creep.memory.energy_from !== s.id);
            //}
            stock_ = creep.pos.findClosestByRange(stock_) || (stock_.length && stock_[0]);
            memory.set(creep.memory, 'stock', stock_);
        }
        if (stock_){
            if (!creep.pos.isNearTo(stock_)){
                creep.moveTo(stock_, default_path_opts)
            } else {
                creep.memory.stock_done = true;
            }
            creep.transfer(stock_, RESOURCE_ENERGY);
            offered[stock_.id] = (offered[stock_.id] || 0) + creep.carry[RESOURCE_ENERGY];
            return;
        } else {
            delete creep.memory.stock;
        }
    }
    return -1;
}

// TODO: cache
function get_structures(creep, type, filter){
    return _.filter(Game.structures, s => (!type || s.structureType === type) && (filter === undefined || filter(s)) );
}
function get_structure(creep, type, filter){
    let ret = get_structures(creep, type, filter);
    return creep.pos.findClosestByRange(ret) || (ret.length && ret[0]);
}

function recharge_tower(creep)
{
    if (creep_.has(creep, CARRY)){
        let tower = get_structure(creep, STRUCTURE_TOWER, s => s.energy < s.energyCapacity);
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
    if (creep_.has(creep, CARRY)){
        if (recharger_energy < (creep.room.energyCapacityAvailable - creep.room.energyAvailable)){
            let spawn = get_structure(creep, null, s => s.energy < s.energyCapacity && s.structureType !== STRUCTURE_TOWER &&
                                        s.id !== '57b8a56ffabeea087e9872b5');
            if (spawn){
                if (!creep.pos.isNearTo(spawn)){
                    creep.moveTo(spawn, default_path_opts);
                }
                if (creep.pos.inRangeTo(spawn,6)){
                    recharger_energy += creep.carry[RESOURCE_ENERGY];
                    if (recharger_energy < (creep.room.energyCapacityAvailable - creep.room.energyAvailable)){
                        fillers += 1;
                        if (fillers >= 2){
                            spawn_filled = true;
                        }
                    }
                }
                creep.transfer(spawn, RESOURCE_ENERGY);
                return;
            }
        }
    }
    return -1;
}

function pickup(creep){
    if (creep_.has(creep, CARRY)){
        let energy_ = creep.pos.findInRange(FIND_DROPPED_ENERGY, 1);
        if (energy_.length){
            creep.pickup(energy_[0]);
            return;
        }
    }
    return -1;
}

function procure_filter(s){
    if (s.energy || s.store){
        return s && my_rooms(s) && (s.energy || s.store[RESOURCE_ENERGY]) + (offered[s.id] || 0) - (wanted[s.id] || 0) >= 10;
    } else {
        console.log('Procure invalid value: ' + s)
        return false
    }
}

function procure(creep){
    if (creep_.has(creep, CARRY)){
        let targets = [];
        let stock_ = [], source_container_, source_container__;
        if (creep.memory.role === 'worker' || (creep.memory.role === 'carrier' &&
                    !spawn_filled )){
            stock_ = stock.filter(procure_filter);
        }
        source_container_ = source_container.filter(procure_filter);
        let storage = source_container_.filter(s => s.structureType === STRUCTURE_STORAGE);
        storage = storage.length && storage[0];
        if (energy === undefined){
            energy = find(FIND_DROPPED_ENERGY, {
                filter: procure_filter
            });
        }
        targets = targets.concat(energy, stock_, source_container_)
        if (creep.memory.role === 'carrier' && targets.length > 1 && storage && spawn_filled){
            targets.splice(targets.indexOf(storage), 1);
        }

        if (creep.memory.role === 'worker'){
            let link = get_structure(creep, STRUCTURE_LINK, s => s.energy);
            if (link && procure_filter(link)){
                if (creep.pos.inRangeTo(link,2)){
                    targets = [link];
                } else {
                    targets.push(link);
                }
            }
        }
        let target = creep.pos.findClosestByRange(targets);
        if (!target && targets.length){
            target = targets[0];
        }

        if (!creep.pos.isNearTo(target)){
            creep.moveTo(target, default_path_opts)
        }
        let ret;
        let key;
        if (target instanceof Energy){
            ret = creep.pickup(target);
            target = target.pos
            key = target;
        } else if (target instanceof Structure){
            ret = creep.withdraw(target, RESOURCE_ENERGY);
            key = target.id
        } else {
            console.log('error',target, targets);
        }
        if (target){
            wanted[key] = (wanted[key] || 0) + (creep.carryCapacity - creep.carry[RESOURCE_ENERGY]);
        }
        if (ret === OK){
            creep.memory.energy_from = memory.pack(target);
        }
        return
    }
    return -1;
}

function upgrade(creep, lvl, room)
{
    lvl = lvl || 11;
    let controller = Game.rooms[room].controller;
    if (creep.memory.role === 'worker' && controller &&
            (memory.upgraders[room].length < 2 ||
             memory.upgraders[room].indexOf(creep.id) !== -1) &&
            (controller.level < lvl ||
                controller.ticksToDowngrade < 1500)){
        if (!creep.pos.isNearTo(controller)){
            //let opts = {}
            //Object.assign(opts, default_path_opts)
            //opts.ignoreCreeps = true;
            //creep.moveTo(5, 16, opts);
            //creep.moveTo(controller, opts);
            if (memory.upgraders[room].indexOf(creep.id) === -1){
                memory.upgraders[room].push(creep.id)
            }
            creep.moveTo(controller, default_path_opts);
        }
        creep.upgradeController(controller);
        return;
    }
    return -1;
}

const attack_paths = {
    W38S59: ['W38S59'],
    W37S59: ['W38S59',
             'W37S59'],
    W39S57: ['W40S59',
             'W40S58',
             'W39S58',
             'W38S58',
             'W38S57',
             'W39S57'],
    W36S57: ['W38S59',
             'W37S59',
             'W37S58',
             'W37S57',
             'W36S57'],
    W39S56: ['W40S59',
             'W40S58',
             'W40S57',
             'W40S56',
             'W39S56'],
}

function fight(creep){

    let target_room = (creep && creep.memory.target_room || 'W39S57');
    let attack_path = attack_paths[target_room];
    let healing_room = (attack_path.length > 1 && attack_path[attack_path.length - 2]) || 'W39S59';
    /*
    let was_hit = creep.hits < (creep.memory.hits || 0);
    creep.memory.hits = creep.hits
    */

    if (nearFlag === undefined){
        nearFlag = Game.flags.Flag3 && Game.flags.Flag3.room && Game.flags.Flag3.pos.findInRange(FIND_MY_CREEPS, 5, {
            filter: c => creep_.has(c, ATTACK),
        });
    }
    /*
    if ((Game.time - (Memory.fighter_barrier || 0) < 200 ) && Game.flags.Flag3 && Game.flags.Flag3.room && Game.flags.Flag3.pos.roomName === creep.pos.roomName &&
            nearFlag.length < fighters_quota){
        if (!creep.pos.inRangeTo(Game.flags.Flag3, 5)){
            creep.moveTo(Game.flags.Flag3);
        }
        return;
    } else {
        Memory.fighter_barrier = Game.time
    }
    */

    let heal_target = creep.pos.findClosestByRange(
                          healer.heal_targets()[creep.pos.roomName])
    if (creep_.has(creep, HEAL)){
      if (heal_target) {
          if (creep.pos.isNearTo(heal_target)){
              creep.heal(heal_target)
          } else {
              creep.moveTo(heal_target)
              creep.rangedHeal(heal_target)
          }
      }
    }

    if (creep.pos.roomName === target_room ||
        creep.pos.roomName === healing_room){
        if ( creep.memory.state === STATE_DELIVERING &&
                    creep.hits <= creep.hitsMax * 0.8 ){
            console.log(creep.name, 'retreting')
            creep.memory.state = STATE_COLLECTING;
        } else if ( (creep.memory.state == STATE_NULL ||
                     creep.memory.state === STATE_COLLECTING ) &&
                         creep.hits === creep.hitsMax && !heal_target ){
            creep.memory.state = STATE_DELIVERING;
            console.log(creep.name, 'moving forward')
        }
        if (creep.memory.state === STATE_DELIVERING) {
            let enemy_structure = creep.room.find(FIND_HOSTILE_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER,
            });
            if (!enemy_structure.length){
                enemy_structure = creep.room.find(FIND_HOSTILE_SPAWNS);
            }
            if (enemy_structure.length){
                let path = creep.pos.findPathTo(enemy_structure[0]);
                if (!path){
                    let opts = {}
                    Object.assign(opts, default_path_opts)
                    opts.ignoreDestructibleStructures = true;
                    creep.moveTo(enemy_structure[0], opts);
                } else {
                    creep.moveByPath(path);
                }
                return
            } else {
                let pos = new RoomPosition(25, 25, target_room);
                if (!creep.pos.inRangeTo(pos,20)){
                    creep.moveTo(pos, default_path_opts);
                }
            }

        } else if (creep.memory.state == STATE_NULL ||
              creep.memory.state === STATE_COLLECTING){
            let pos = new RoomPosition(25, 25, healing_room);
            if (!creep.pos.inRangeTo(pos,22)){
                creep.moveTo(pos, default_path_opts);
            }
            return
        }
    } else {
        let index = attack_path.indexOf(creep.pos.roomName)
        if (index === -1){
            index = 0;
        } else {
            index += 1;
        }
        creep.moveTo(new RoomPosition(25, 25, attack_path[index]), default_path_opts);
        //creep.moveByPath(creep.pos.findPathTo(new RoomPosition(25, 25, target_room), default_path_opts));
    }

    let enemy = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (enemy){
        creep.attack(enemy)
        if (!creep.pos.isNearTo(enemy)){
            creep.moveTo(enemy, default_path_opts);
            return
        }
    }
}

function tower_act(tower){
    let enemy = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (enemy){
        tower.attack(enemy);
        return
    }
    let injured = tower.pos.findClosestByRange(healer.heal_targets()[tower.pos.roomName]);
    if (injured){
        tower.heal(injured);
        return
    }
    if (damaged_half.length){
        let damaged_half_ = tower.pos.findClosestByRange(damaged_half);
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


const _my_rooms = [
    'W39S59',
    'W38S59',
    'W37S59',
    'W37S57',
    ]
function my_rooms(s){
    return s && s.pos && _my_rooms.indexOf(s.pos.roomName) !== -1;
}

module.exports.loop = function () {

    energy = undefined;
    healer.update();
    claimer.update();

    if (memory.upgraders === undefined){
        memory.upgraders = {}
    }
    var rooms = ['W37S57','W39S59'];
    for (let i in rooms){
        let room = rooms[i];
        if (memory.upgraders[room] === undefined){
            memory.upgraders[room] = []
        }
        for (let i in memory.upgraders[room]){
            let id = memory.upgraders[room][i]
            if (memory.unpack(id) === null){
                memory.upgraders[room].splice(i, 1)
            }
        }
    }

    let recycling = false;
    recharger_energy = 0;
    maintenance_count = 0;
    fillers = 0;
    wanted = {};
    offered = {};
    recharger_tower_energy = {};
    damaged = Object.keys(Game.structures).map(key => Game.structures[key])
    let neutral = find(FIND_STRUCTURES);
    damaged = damaged.concat(neutral);
    damaged = damaged.filter(s => my_rooms(s));
    stock = find(FIND_STRUCTURES, {
        filter: is_stock,
    });
    stock = stock.filter(my_rooms);

    let room = Game.rooms['W39S59'];
    spawn_filled = room.energyAvailable >= 0.8 * room.energyCapacityAvailable;
    if (Object.keys(Game.constructionSites).length === 0){
        Memory.upper_limit = upper_limits[room.controller.level];
    }
    damaged = damaged.filter(s => is_damaged(s));
    damaged_half = damaged.filter(s => is_damaged(s, 0.9));
    damaged_down = damaged.filter(s => is_damaged(s, 0.8));

    let towers = _.filter(Game.structures, s => s.structureType === STRUCTURE_TOWER);
    for (let key in towers) {
        tower_act(towers[key]);
    }

    let links = _.filter(Game.structures, s => s.structureType === STRUCTURE_LINK);
    let sink;
    let fountain;
    for (let key in links) {
        if (links[key].pos.x === 30 && links[key].pos.y === 12){
            sink = links[key];
        } else if (links[key].pos.x === 3 && links[key].pos.y === 17){
            fountain = links[key];
        }
    }
    if ( sink && fountain &&
         (sink.energy > 0.85 * sink.energyCapacity ||
         (fountain.energy < 50 && sink.energy > 0.5 * sink.energyCapacity))){
                sink.transferEnergy(fountain);
    }


    source_work_count = {};
    /*
    source_work_count = Memory.source_work_count;
    if (!source_work_count){
        source_work_count = {}
        Memory.source_work_count = source_work_count;
    } else {
        let keys = Object.keys(source_work_count);
        for (let key in keys){
            if (Object.keys(Game.creeps).indexOf(source_work_count[key]) === -1){
                delete source_work_count[key];
            }
        }
        Memory.source_work_count = source_work_count;
    }
    */
    container_of_source = {};
    source_container = [];
    let sources = find(FIND_SOURCES, {
        filter: my_rooms,
    });
    for (let key in sources){
        let source = sources[key];
        let container = source.pos.findInRange(FIND_STRUCTURES, 2,{
            filter: is_stock
        });
        container = container.filter(has_space)
        if (container.length){
            if(source_container.indexOf(container[0]) === -1){
                source_container.push(container[0]);
            }
            container_of_source[source.id] = container[0];
        }
    }

    room2 = Game.rooms['W37S57'];
    if (room2){
        room2.createConstructionSite(35, 26, STRUCTURE_TOWER);
        room2.createConstructionSite(20, 14, STRUCTURE_EXTENSION);
        room2.createConstructionSite(20, 12, STRUCTURE_EXTENSION);
        room2.createConstructionSite(20, 18, STRUCTURE_EXTENSION);
        room2.createConstructionSite(20, 16, STRUCTURE_EXTENSION);
        room2.createConstructionSite(19, 17, STRUCTURE_EXTENSION);
        room2.createConstructionSite(19, 11, STRUCTURE_EXTENSION);
        room2.createConstructionSite(19, 15, STRUCTURE_EXTENSION);
        room2.createConstructionSite(18, 12, STRUCTURE_EXTENSION);
        room2.createConstructionSite(18, 18, STRUCTURE_EXTENSION);
        room2.createConstructionSite(18, 16, STRUCTURE_EXTENSION);
        room2.createConstructionSite(18, 17, STRUCTURE_EXTENSION);
        room2.createConstructionSite(22, 4, STRUCTURE_RAMPART);
        room2.createConstructionSite(47, 28, STRUCTURE_RAMPART);
        room2.createConstructionSite(33, 47, STRUCTURE_RAMPART);
        room2.createConstructionSite(43, 1, STRUCTURE_RAMPART);
        room2.createConstructionSite(22, 4, STRUCTURE_ROAD);
        room2.createConstructionSite(47, 28, STRUCTURE_ROAD);
        room2.createConstructionSite(33, 47, STRUCTURE_ROAD);
        room2.createConstructionSite(43, 1, STRUCTURE_ROAD);
    }
    if (room2){
        if (Game.flags.a && Game.flags.b){
            let c = Game.flags.c.pos
            let d = c.findClosestByRange(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_ROAD,
            })
            d = d && d.pos
            let a = Game.flags.a.pos;
            let b = Game.flags.b.pos;
            //let vertices = [[a,b], [c,d]];
            //let vertices = [[a,b]];
            let vertices = []
            let opts = {}
            Object.assign(opts, default_path_opts)
            opts.heuristicWeight = 10000;
            opts.ignoreCreeps = true;
            opts.ignoreRoads = true
            for (let i in vertices){
                let a = vertices[i][0]
                let b = vertices[i][1]
                let path = a.findPathTo(b, opts)
                //path = [];
                for (let i in path){
                    let tile = path[i];
                    console.log(tile.x,tile.y)
                    //room2.createConstructionSite(tile.x, tile.y,
                    //      STRUCTURE_ROAD);
                    // lets all be friends!! xD
                }
            }
        }

    }
    room.createConstructionSite(21, 9, STRUCTURE_EXTENSION);
    room.createConstructionSite(21, 5, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 4, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 8, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 10, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 6, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 7, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 9, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 5, STRUCTURE_EXTENSION);

    let workers = Memory.workers || []
    let carriers = Memory.carriers || []
    let harvesters = Memory.harvesters || []
    let fighters = Memory.fighters || []
    let claimers = Memory.claimers || []
    let healers = Memory.healers || []

    let harvester_work = 0

    for (let key in  Game.creeps){
        let creep = Game.creeps[key];

        if (creep.memory.recycle){
            recycling = true;
            let spawn = creep.pos.findClosestByRange(_.values(Game.spawns)) ||
                              Game.spawns.Spawn1;
            if (!creep.pos.isNearTo(spawn)){
                creep.moveTo(spawn)
            }
            spawn.recycleCreep(creep);
            continue
        }

        if (creep.memory.role === 'worker'){
            if (workers.indexOf(creep.id) === -1){
                workers.push(creep.id)
            }
        } else if (creep.memory.role === 'carrier'){
            if (carriers.indexOf(creep.id) === -1){
                carriers.push(creep.id)
            }
        } else if (creep.memory.role === 'harvester'){
            if (harvesters.indexOf(creep.id) === -1){
                harvesters.push(creep.id)
            }
            harvester_work += creep_.has(creep,WORK);
        } else if (creep.memory.role === 'fighter'){
            if (fighters.indexOf(creep.id) === -1){
                fighters.push(creep.id)
            }
        } else if (creep.memory.role === 'healer'){
            if (healers.indexOf(creep.id) === -1){
                healers.push(creep.id)
            }
        } else if (creep.memory.role === 'claimer'){
            if (claimers.indexOf(creep.id) === -1){
                claimers.push(creep.id)
            }
        }
    }
    let worker_count = workers.length,
        carrier_count = carriers.length,
        harvester_count = harvesters.length,
        fighter_count = fighters.length,
        claimer_count = claimers.length,
        healer_count = healers.length

    let creeps = workers.concat(carriers,
                                harvesters,
                                fighters,
                                claimers,
                                healers)

    for (let key in  Game.creeps){
        let creep = Game.creeps[key];
        let state = creep.memory.state;
        /*
        if (creep_.has(creep,WORK) && creep_.has(creep,CARRY)){
            workers += 1;
        } else if (creep_.has(creep,CARRY)){
            carriers += 1;
        } else if (creep_.has(creep,WORK)){
            harvesters += 1;
            harvester_work += creep_.has(creep,WORK);
        }*/

        if (typeof creep.memory.state !== 'string'){
            creep.memory.state = STATE_NULL;
        }
        if (creep.memory.role === 'carrier' ||
            creep.memory.role === 'worker' ){
            if ((!state || state === STATE_COLLECTING) &&
                    creep.carry[RESOURCE_ENERGY] > (0.9 * creep.carryCapacity)){
                state = STATE_DELIVERING;
                memory.set(creep.memory, 'state', state)
            } else if (state === STATE_DELIVERING &&
                        (!creep.carry[RESOURCE_ENERGY] ||
                            (creep.memory.stock_done &&
                                creep.carry[RESOURCE_ENERGY] < 50))){
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
            claimer.action(creep);
            continue;
        } else if (creep.memory.role === 'healer' ){
            healer.action(creep);
            continue;
        }

        pickup(creep);


        let ret = -1;
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
                ret = upgrade(creep, 2, 'W39S59');
            }
            if (ret){
                ret = upgrade(creep, 10, 'W37S57');
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
            ret &= repair_near(creep);
            if (ret){
                ret = upgrade(creep, 10, 'W39S59');
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
                ret = deposit(creep, true);
            }
            if (ret){
                console.log('' + creep.name + ' in idle delivering')
                ret = idle(creep)
            }
        }
    }
    let memory_ = {};
    let towerless_rooms = ['W38S59',
                           'W38S58',
                           'W37S57',
                   ]
    let hostile_at
    for (let name in towerless_rooms){
      let room = Game.rooms[name];
      hostile_at = room && room.find(FIND_HOSTILE_CREEPS).length;
      if (hostile_at){
          memory_.target_room = name;
          break
      }
    }
    fighters_quota = 0 + (hostile_at || 0)
    let role = '';
    if (fighter_count < fighters_quota){
        role = 'f'
        ret = creep_.create('fighter',
                [[TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
                 [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL],
        ], memory_);

    } else if (harvester_work < 30 && harvester_count < 7){
        role = 'h';
        ret = creep_.create('harvester',
                [[WORK,WORK,MOVE],
                 [WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,CARRY],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,CARRY],
                 [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,CARRY],
        ]);
    } else if (carrier_count < 6){
        role = 'c'
        ret = creep_.create('carrier',
                [[CARRY,CARRY,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
                 [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
        ]);
    } else if (worker_count < 6){
        role = 'w'
        ret = creep_.create('worker',
                [[WORK,WORK,CARRY,MOVE],
                 [WORK,WORK,CARRY,CARRY,MOVE,MOVE],
                 [WORK,WORK,WORK,CARRY,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],
                 [WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
        ]);
    } else if (claimer_count < 2){
        role = 'cl'
        ret = creep_.create('claimer',
                [[CLAIM,MOVE],
                 [CLAIM,CLAIM,MOVE,MOVE],
        ]);
    } else if (healer_count < 0){
        role = 'he'
        ret = creep_.create('healer', healer.parts);
    }
    if (!role && !recycling &&
            room.energyAvailable === room.energyCapacityAvailable){
        for (let key in Game.creeps){
            let creep = Game.creeps[key];
            let cost = creep_.sum_cost(creep.body);
            if (cost < 500 &&
                    (creep.memory.role === 'worker' ||
                    creep.memory.role === 'carrier' ||
                    creep.memory.role === 'harvester')){
                creep.memory.recycle = true;
                break
            }
        }
    }
    console.log('' + Object.keys(Game.creeps).length +
                (role && (' s' + role) || '   ') +
                ' w' + worker_count +
                ' c' + carrier_count +
                //' h' + harvester_count +
                ' hw' + harvester_work +
                ' f' + fighter_count +
                ' he' + healer_count +
                ' cl' + claimer_count +
                ' ' + Game.cpu.getUsed().toFixed(2));
}
