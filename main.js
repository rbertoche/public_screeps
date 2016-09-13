
memory = require('memory')
find = require('find')
healer = require('healer')
claimer = require('claimer')
// ???! o var é necessário aqui, talvez devido a alterações no módulo durante a execução
var spawn = require('spawn')


STATE_NULL = '';
STATE_DELIVERING = 'delivering';
STATE_COLLECTING = 'collecting';

/* Globals -
    não são declarados pra garantir que sejam globais
    quando o valor é atribuído sem a declaração, a variável se torna global

    O script não é executado as is, então embora pareça que estamos no escopo global,
    podemos estar rodando dentro de uma função

    As declarações serão mantidas comentadas por clareza

var container_of_source,
    source_work_count,
    maintenance_count,
    source_container;
var damaged, damaged_down, damaged_half, stock;
var recharger_energy, recharger_tower_energy;
var spawn_filled, fillers;

var wanted , offered
var nearFlag;
var fighters_quota;
var energy

*/

const CACHE_TIME_TO_LIVE = 8


function getLine(strip){
    return getStack().split('\n')[(strip || 0) + 1].slice(4)
}
Error.getLine = getLine

function getStack(){
    return getErrorObject().stack.split('\n').slice(3).join('\n')
}
Error.getStack = getStack

function getErrorObject(){
  return new Error()
}

function logCpu(a){
    if (a !== undefined){
        console.log(a, Game.cpu.getUsed().toFixed(2), getLine(1))
    }
}

const default_path_opts = {
    ignoreCreeps: false,
    maxOps: 10000,
    serializePath: true,
    reusePath: 10,
    heuristicWeight: 1.4,
    //avoid: ['W35S57']
//    heuristicWeight: 1,
//    algorithm: 'astar',
}

function get_maintenance(creep){
    /*
    if (filter === undefined){
        filter = () => { return true }
    }
    let filter_
    if (!creep.memory.roaming){
        filter_ = (s) => only_spawn_room(creep)(s) && filter(s);
    } else {
        filter_ = filter
    }
    */
    let ret = Game.getObjectById(creep.memory.maintenance);
    if (!ret || ret === undefined ||
                (!(ret.structureType !== undefined &&
                   ret.progress !== undefined)
                 && !spawn.is_damaged_down(ret))){
        let sites
        if (!creep.memory.roaming){
            sites = spawn.sites[creep.memory.spawn];
        } else {
            sites = _.filter(Game.constructionSites, s => s.room);
            sites = sites.concat(spawn.damaged_down)
        }
        ret = creep.pos.findClosestByRange(sites);
        if (!ret && sites.length){
            ret = sites[0];
        }
        if (ret){
            creep.memory.maintenance = ret.id
        }
    }
    return ret;
}

function get_near_maintenance(creep){
    let ret = creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3)
    let damaged_ = creep.pos.findInRange(FIND_STRUCTURES, 3, {
        filter: spawn.is_damaged
    })
    ret = ret.concat(damaged_)
    ret = ret.length && ret[0];
    return ret
}

function maintenance_near(creep){
    if (creep.memory.role === 'worker'){
        let target = get_near_maintenance(creep);
        if (target){
            let ret;
            if (target.progress !== undefined){
                ret = creep.build(target);
            } else {
                ret = creep.repair(target);
            }
            return ret;
        }
    }
    return -1;
}

const username = 'rber'

function reserved_or_mine(s){
    if (!s.room){
        return false
    } else {
        return true
        let controller = s.room.controller
        return controller.my || (controller.reservation &&
                    controller.reservation.username === username)
    }
}

/*

TODO:
Se toda busca de alvos feita pelos creeps acontecer depois
da recuperação de avaliação de alvos em memória, menos casos
de harvesters roubando lugares uns dos outros tenderão a acontecer

*/

function source_filter(creep){
    return s => s && spawn.my_rooms(s) && reserved_or_mine(s) &&
                    s.id !== '579fa9050700be0674d2ea49' &&
                    ((source_work_count[s.id] || 0) +
                        creep.has(WORK) <= 6);
                    spawn.source_rooms_table[creep.memory.spawn].
                            indexOf(spawn.room_to_spawn[s.room.name]) !== -1;
}

const unwanted = [
    ]

function harvest(creep)
{
    if (creep.memory.role === 'harvester'){
        let source = Game.getObjectById(creep.memory.source)
        if (creep.memory.source === undefined || !source_filter(source)){
            delete creep.memory.source
            source = find(FIND_SOURCES, {
                    filter: source_filter(creep),
                })
            source = creep.pos.findClosestByPath(source) || source.length && source[0];
            creep.memory.source = source.id
        }
        let target = source;
        let containers, container
        if (source){
            containers = container_of_source[source.id];
            containers = containers && containers.filter(has_space)
            container = containers && (containers[0] || containers.length)
        }

        if (source){
            let working = false;
            let hold = false;
            if (creep.has(CARRY)){
                let damaged_ = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                            filter: s => is_stock(s) && (s.hits < s.hitsMax),
                });
                damaged_ = damaged_.concat(creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2))
                if (Memory.unwanted_structures !== undefined){
                    damaged_ = damaged_.filter(s => Memory.unwanted_structures.indexOf(s.id) === -1)
                }
                if (damaged_.length){
                    let ret
                    if (creep.carry[RESOURCE_ENERGY] < creep.has(WORK) * 5){
                        hold = true;
                    } else if (damaged_[0].progressTotal){
                        ret = creep.build(damaged_[0])
                    } else {
                        ret = creep.repair(damaged_[0], RESOURCE_ENERGY);
                    }
                    working = ret === OK;
                }
            }
            let pos
            if (container && creep.has(CARRY) ){
                let around_source = source.room.lookForAtArea(LOOK_TERRAIN,
                                        container.pos.y - 1, container.pos.x - 1,
                                        container.pos.y + 1, container.pos.x + 1, true)
                around_source = _.filter(around_source, s => s.terrain !== 'wall')
                around_source = around_source.map(s => s.x + s.y * 100)
                let around_container = source.room.lookForAtArea(LOOK_TERRAIN,
                                        source.pos.y - 1, source.pos.x - 1,
                                        source.pos.y + 1, source.pos.x + 1, true)
                around_container = _.filter(around_container, s => s.terrain !== 'wall')
                around_container = around_container.map(s => s.x + s.y * 100)
                let intersection = _.intersection(around_source, around_container)
                if (intersection.length){
                    let target = creep.pos.findClosestByRange(intersection) || intersection.length && intersection[0]
                    pos = source.room.getPositionAt(target % 100, Math.floor(target / 100));
                } else {
                    console.log('Error at source container', container, container.pos)
                }
            } else {
                pos = source.pos
            }
            if (!working){
                creep.harvest(source)
                if (!hold && container){
                    creep.transfer(container, RESOURCE_ENERGY)
                }
            }
            if (!creep.pos.isEqualTo(pos)){
                if (creep.memory._move && !creep.memory._move.path){
                    delete creep.memory._move
                }
                creep.moveTo(pos, default_path_opts);
            }
            source_work_count[source.id] = (source_work_count[source.id] || 0) + creep.has(WORK);
            return;

        } else {
            /* Just waiting for the visitor is working better
             * if harvesters had target_rooms, we could get something like
             * this visit code to work
             */
            for (let i in spawn.source_rooms_table[creep.memory.spawn]){
                var name = spawn.source_rooms_table[creep.memory.spawn][i]
                if (Game.rooms[name] === undefined){
                    creep.moveTo(new RoomPosition(25,25, name, default_path_opts));
                    return
                }
            }
            /*
            if (!creep.pos.inRangeTo(Game.flags.Flag1, 4)){
                creep.moveTo(Game.flags.Flag1, default_path_opts);
            }
            */
            console.log(creep.name, 'at', creep.pos, 'cant find source')
        }
    }
    return -1;
}

function goto_maintenance(creep){
    if (creep.memory.role === 'worker'){
        let site = get_maintenance(creep)
        if (site){
            enemies = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 4)
            enemies_ = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3)
            if ((enemies.length === 0 || !enemies[0])){
                if(!creep.pos.isNearTo(site)){
                    creep.moveTo(site, default_path_opts);
                }
            } else if (enemies_.length && enemies_[0]){
                creep.moveTo(creep.room.getPositionAt(25,25))
            }
            return;
        }
    }
    return -1;
}

// o hainer n devia pegar do storage
function has_space(s, space){
    let amount
    if (s.energy !== undefined){
        amount = s.energy
    } else if (s.store !== undefined){
        amount = s.store[RESOURCE_ENERGY]
    } else {
        console.log('has_space shouldn\'t be called with', s)
    }
    return s && - amount - (offered[s.id] || 0)
                + (wanted[s.id] || 0) + (s.storeCapacity || s.energyCapacity) > (space || 0);
}

function has_some_space(s){
    return has_space(s, 60)
}

function stock_filter(creep, to_other_room){
    return s => s && has_space(s) && (Game.spawns[creep.memory.spawn].room.name === s.room.name ||
                                        to_other_room) &&
                                        (!s.pos.findInRange(FIND_SOURCES, 2).length
                                        || (s.structureType === STRUCTURE_STORAGE &&
                                            !use_storage(s)))
}

function deposit(creep)
{
    if (creep.has(CARRY)){
        if (!creep.memory.roaming && !room_filled(creep.memory.spawn)){
            return -1;
        }

        let stock_ = creep.memory.stock !== undefined && memory.get(creep.memory, 'stock');
        if (creep.memory.stock === undefined || !stock_filter(creep)(stock_)){
            stock_ = stock.filter(stock_filter(creep));
            //if (!to_storage){
            stock_ = stock_.filter(s => creep.memory.energy_from !== s.id);
            if (stock_.length === 0 && creep.memory.spawn === 'Spawn1' &&
                                        creep.memory.role === 'carrier' &&
                                        creep.memory.roaming){
                stock_ = stock.filter(stock_filter(creep, true));
                stock_ = stock_.filter(s => creep.memory.energy_from !== s.id);
            }

            //}
            stock_ = creep.pos.findClosestByRange(stock_) || (stock_.length && stock_[0]);
            memory.set(creep.memory, 'stock', stock_);
        }
        if (stock_){
            if (!creep.pos.isNearTo(stock_)){
                creep.moveTo(stock_, default_path_opts)
            } //else {
                //creep.memory.stock_done = true;
            //}
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
    return creep.pos.findClosestByRange(ret) || (ret.length && ret[0]) || null;
}

function tower_filter(creep){
    return s => has_some_space(s) &&
                    Game.spawns[creep.memory.spawn].room.name === s.room.name;
}

function recharge_tower(creep)
{
    if (creep.has(CARRY)){
        let target = Game.getObjectById(creep.memory.tower)
        if (creep.memory.tower === undefined ||
                room_filled_transition[creep.memory.spawn] ||
                (target !== null && !tower_filter(creep)(target)) ||
                (creep.memory.expires_t || 0) < Game.time){
            target = get_structure(creep, STRUCTURE_TOWER, tower_filter(creep))
            if (target){
                creep.memory.tower = target.id
            } else {
                creep.memory.tower = null
            }
            creep.memory.expires_t = Game.time + CACHE_TIME_TO_LIVE
        }
        if (target && (recharger_tower_energy[target.id] || 0) < (target.energyCapacity - target.energy)){
            if (!creep.pos.isNearTo(target)){
                creep.moveTo(target, default_path_opts);
            }
            recharger_tower_energy[target.id] = (recharger_tower_energy[target.id] || 0) + creep.carry[RESOURCE_ENERGY];
            let ret = creep.transfer(target, RESOURCE_ENERGY);
            offered[target.id] = (offered[target.id] || 0) + creep.carry[RESOURCE_ENERGY];
            //if (ret === OK){
                //creep.memory.stock_done = true
            //}
            return;
        }
    }
    return -1;
}

function link_filter(creep){
    return s => has_space(s) &&
                        s.isActive() &&
                        creep.pos.inRangeTo(s, 12) &&
                        creep.memory.role !== 'worker' &&
                        Game.spawns[creep.memory.spawn].room.name === s.room.name &&
                                    s.id !== '57b8a56ffabeea087e9872b5' &&
                                    s.id !== '57c2a7a2af63961028cf6e54' &&
                                    s.id !== '57d2f495d6eac16a7294db44'
}

function recharge_link(creep)
{
    if (creep.has(CARRY)){
        let target = Game.getObjectById(creep.memory.link)
        if (creep.memory.link === undefined ||
                room_filled_transition[creep.memory.spawn] ||
                (target !== null && !link_filter(creep)(target)) ||
                (creep.memory.expires_l || 0) < Game.time){
            target = get_structure(creep, STRUCTURE_LINK, link_filter(creep))
            if (target){
                creep.memory.link = target.id
            } else {
                creep.memory.link = null
            }
            creep.memory.expires_l = Game.time + 4
        }
        if (target){
            if (!creep.pos.isNearTo(target)){
                creep.moveTo(target, default_path_opts);
            }
            let ret = creep.transfer(target, RESOURCE_ENERGY);
            offered[target.id] = (offered[target.id] || 0) + creep.carry[RESOURCE_ENERGY];
            //if (ret === OK){
                //creep.memory.stock_done = true
            //}
            return;
        }
    }
    return -1;
}

function recharge_filter(creep){
    return s => s && (s.structureType === STRUCTURE_SPAWN ||
                s.structureType === STRUCTURE_EXTENSION) &&
            creep.pos.inRangeTo(s, 18) &&
            has_space(s) &&
            s.isActive() &&
            Game.spawns[creep.memory.spawn].room.name === s.room.name
}

function recharge(creep)
{
    if (creep.has(CARRY)){
        let target = Game.getObjectById(creep.memory.recharge)
        if (creep.memory.recharge === undefined ||
                room_filled_transition[creep.memory.spawn] ||
                (target !== null && !recharge_filter(creep)(target)) ||
                (creep.memory.expires_r || 0) < Game.time){
            target = get_structure(creep, null, recharge_filter(creep))
            if (target){
                creep.memory.recharge = target.id
            } else {
                creep.memory.recharge = null
            }
            creep.memory.expires_r = Game.time + CACHE_TIME_TO_LIVE
        }
        if (target){
            if (!creep.pos.isNearTo(target)){
                creep.moveTo(target, default_path_opts);
            }
            creep.transfer(target, RESOURCE_ENERGY);
            offered[target.id] = (offered[target.id] || 0) + creep.carry[RESOURCE_ENERGY];
            return;
        }
    }
    return -1;
}

function pickup(creep){
    if (creep.has(CARRY)){
        let energy_ = creep.pos.findInRange(FIND_DROPPED_ENERGY, 1);
        if (energy_.length){
            creep.pickup(energy_[0]);
            return;
        }
    }
    return -1;
}

function energy_key(e){
    return e.pos.x + ' ' + e.pos.y + ' ' + e.pos.roomName
}

function procure_filter(creep){
    return s => {
        if (s){
            let key, amount
            if (s.amount !== undefined){
                key = energy_key(s)
                amount = s.amount
                cutoff = 10
            } else {
                amount = s.store && s.store[RESOURCE_ENERGY] || s.energy
                key = s.id
                if (s.structureType === STRUCTURE_LINK){
                    cutoff = 0
                } else {
                    cutoff = 80
                }
            }
            return spawn.my_rooms(s) && (s.id === '57d08adbd208131769567049' || 
                            !(s.structureType === STRUCTURE_STORAGE) ||
                            (use_storage(s) &&
                                s.room.name === Game.spawns[creep.memory.spawn].room.name &&
                                !creep.memory.roaming)) &&
                        amount + (offered[key] || 0) - (wanted[key] || 0) > cutoff
        } else {
            //console.log('Procure invalid value: ' + s)
            return false
        }
    }
}

function only_spawn_room(creep){
    return s => s.room && s.room.name === Game.spawns[creep.memory.spawn].room.name;
}
function never_spawn_room(creep){
    let filter = only_spawn_room(creep);
    return s => !filter(s);
}


/*
priority_procure_targets = {
    Spawn1: [
                new RoomPosition(30,32,'W38S59'),
                new RoomPosition(36,42,'W39S58'),
                new RoomPosition(14,44,'W38S58'),
                new RoomPosition(19, 4,'W37S59'),
    ],
    Spawn2: [
                new RoomPosition(24,41,'W37S56'),
                new RoomPosition(23,18,'W37S58'),
                new RoomPosition(14,39,'W38S56'),
                new RoomPosition(5,41,'W37S55'),

    ],
    Spawn3: [
                new RoomPosition(24,41,'W37S56'),
                new RoomPosition(23,18,'W37S58'),
                new RoomPosition(14,39,'W38S56'),
                new RoomPosition(5,41,'W37S55'),

    ],
}
*/

function procure(creep){
    if (creep.has(CARRY)){
        let target
        let cache_expired = (creep.memory.expires_p || 0) < Game.time
        if (creep.memory.procure === undefined ||
                !procure_filter(creep)(Game.getObjectById(creep.memory.procure)) ||
                cache_expired){
            let targets = [];
            let stock_ = [], source_container_, source_container__;
            if (creep.memory.role === 'worker' || (creep.memory.role === 'carrier' &&
                        !creep.memory.roaming &&
                        !room_filled(creep.memory.spawn))){
                            // Não deveria depender de room_filled, e sim de ter
                            // passado em todos os recharge sem pegar alvo
                stock_ = stock.filter(procure_filter(creep));
                stock_ = stock_.filter(only_spawn_room(creep))
            }
            source_container_ = source_container.filter(procure_filter(creep));
            stock_ = stock_.filter(only_spawn_room(creep))
            let energy_
            if (energy === undefined){
                energy_ = find(FIND_DROPPED_ENERGY, {
                    filter: procure_filter(creep)
                });
            }
            if (creep.memory.roaming && creep.memory.role === 'carrier'){
                source_container_ = source_container_.filter(
                            s => spawn.procure_rooms_table[creep.memory.spawn].indexOf(s.room.name) !== -1);
                energy_ = energy_.filter(
                            s => spawn.procure_rooms_table[creep.memory.spawn].indexOf(s.room.name) !== -1);
            }

            targets = targets.concat(energy_, stock_, source_container_)

            if (creep.memory.role === 'worker'){
                let link = get_structure(creep, STRUCTURE_LINK);
                if (link && procure_filter(creep)(link)){
                    if (creep.pos.inRangeTo(link,3)){
                        targets = [link];
                    } else {
                        targets.push(link);
                    }
                }
                let targets_here = targets.filter(s => s && s.room.name === creep.room.name)
                if (targets_here.length && targets_here[0]){
                    targets = targets_here
                }
                //console.log(' 1 ' + targets)
            }
            if (!creep.memory.roaming){
                targets = targets.filter(only_spawn_room(creep))
            }

            if (!target){
                target = creep.pos.findClosestByRange(targets);
            }
            if (!target && targets.length){
                /* Desativado por ser meio redundante com o procure_rooms_table
                let priority_targets = priority_procure_targets[creep.memory.spawn]
                for (let i in priority_targets){
                    let pos = priority_targets[i]
                    let targets_ = targets.filter(s => pos.inRangeTo(s,3))
                    if (targets_.length && targets_[0] !== undefined){
                        target = targets_[0]
                        break
                    }
                }
                */
                if (!target){
                    target = targets[0]
                }
            }
            if (target){
                creep.memory.procure = target.id;
                if (creep.memory.role === 'worker'){
                    creep.memory.expires_p = Game.time + CACHE_TIME_TO_LIVE
                } else {
                    creep.memory.expires_p = Game.time + CACHE_TIME_TO_LIVE * 3
                }
            } else {
                return -1
            }
        } else {
            target = Game.getObjectById(creep.memory.procure);
        }
        if (!creep.pos.isNearTo(target)){
            creep.moveTo(target, default_path_opts)
        }
        let ret;
        let key;
        let amount = target.energy || target.amount || (target.store && target.store[RESOURCE_ENERGY])
        if (target.amount !== undefined){
            ret = creep.pickup(target);
            key = energy_key(target);
            target = target.pos
        } else {
            ret = creep.withdraw(target, RESOURCE_ENERGY);
            key = target.id
        }
        if (target){
            let space_left = (creep.carryCapacity - creep.carry[RESOURCE_ENERGY])
            wanted[key] = (wanted[key] || 0) + Math.min(amount, space_left);
        }
        if (ret === OK){
            delete creep.memory.procure;
            creep.memory.energy_from = memory.pack(target);
        }
        return
    }
    return -1;
}

function upgrade(creep, lvl, room)
{
    lvl = lvl || 11;
    if (room === undefined){
        room = Game.spawns[creep.memory.spawn].room
    } else if (typeof room === 'string'){
        let name = room
        room = Game.rooms[name]
        if (room === undefined){
            console.log('Error: room', name, 'not found')
            return -1;
        }
    }
    let controller = room.controller
    if (creep.memory.role === 'worker' && controller &&
            //(memory.upgraders[room].length < 2 ||
            // memory.upgraders[room].indexOf(creep.id) !== -1) &&
            (controller.level < lvl ||
                controller.ticksToDowngrade < 3000)){
        if (!creep.pos.isNearTo(controller)){
            //let opts = {}
            //Object.assign(opts, default_path_opts)
            //opts.ignoreCreeps = true;
            //creep.moveTo(5, 16, opts);
            //creep.moveTo(controller, opts);
            //if (memory.upgraders[room].indexOf(creep.id) === -1){
            //    memory.upgraders[room].push(creep.id)
            //}
            creep.moveTo(controller, default_path_opts);
        }
        creep.upgradeController(controller);
        return;
    }
    return -1;
}

/*

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

*/

function fight(creep){

    let target_room = (creep && creep.memory.target_room || 'W34S58');
    let healing_room = 'W35S58'
    //let healing_room = 'W37S57'
    //let healing_room = Game.spawns[creep.memory.spawn].room.name
    /*
    let attack_path = attack_paths[target_room];
    let healing_room = (attack_path.length > 1 && attack_path[attack_path.length - 2]) || 'W39S59';
    let was_hit = creep.hits < (creep.memory.hits || 0);
    creep.memory.hits = creep.hits
    */

    /*
    if (nearFlag === undefined){
        nearFlag = Game.flags.Flag3 && Game.flags.Flag3.room && Game.flags.Flag3.pos.findInRange(FIND_MY_CREEPS, 5, {
            filter: c => c.has(ATTACK),
        });
    }
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

    /*
    if (creep.pos.roomName === target_room ||
        creep.pos.roomName === healing_room){
        if ( creep.memory.state === STATE_DELIVERING &&
                    creep.hits <= creep.hitsMax * 0.9 ){
            console.log(creep.name, 'retreting')
            creep.memory.state = STATE_COLLECTING;
        } else if ( (creep.memory.state == STATE_NULL ||
                     creep.memory.state === STATE_COLLECTING ) &&
                         creep.hits === creep.hitsMax && !heal_target ){
            creep.memory.state = STATE_DELIVERING;
            console.log(creep.name, 'moving forward')
        }
        if (creep.memory.state === STATE_DELIVERING) {
            console.log('del')
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
            }
        } else if (creep.memory.state == STATE_NULL ||
              creep.memory.state === STATE_COLLECTING){
            console.log('col')
            let pos = new RoomPosition(25, 25, healing_room);
            if (!creep.pos.inRangeTo(pos,22)){
                let opts = {}
                Object.assign(opts, default_path_opts)
                opts.ignoreDestructibleStructures = true;
                creep.moveTo(pos, opts);
            }
            return
        }
    }
    */
    let pos = new RoomPosition(25, 25, target_room)

    let enemy = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: c => c.owner.username !== 'Muddal',
    });

    let heal_target = creep.pos.findClosestByRange(
                          healer.heal_targets()[creep.pos.roomName]) ||
                          healer.heal_targets_all().length && healer.heal_targets_all()[0]
    let ret
    //if (creep.has(HEAL) && heal_target) {
    if (creep.has(HEAL) && heal_target && !creep.pos.isNearTo(enemy)){
        if (creep.pos.isNearTo(heal_target)){
            ret = creep.heal(heal_target)
        } else {
            ret = creep.rangedHeal(heal_target)
        }
    }
    if (enemy){
        console.log('enemy')
        if (!creep.pos.isNearTo(enemy)){
            creep.moveTo(enemy, default_path_opts);
        } else {
        // Maybe consider how much damage in the heal target?
        //} else if(ret !== OK) {
            creep.attack(enemy)
        }
        return
    } else if (!creep.pos.inRangeTo(pos, 23) && !creep.memory.done){

        /*
        let index = attack_path.indexOf(creep.pos.roomName)
        if (index === -1){
            index = 0;
        } else {
            index += 1;
        }
        */
        //creep.moveByPath(creep.pos.findPathTo(pos, default_path_opts));

        //let opts = {}
        //Object.assign(opts, default_path_opts)
        //opts.ignoreDestructibleStructures = true;
        //creep.moveTo(pos, opts)
        creep.moveTo(pos, default_path_opts)

    } else {
        console.log(creep.name, 'done')
        creep.memory.done = false
        if (creep.has(HEAL) && heal_target) {
            if (!creep.pos.isNearTo(heal_target)){
                creep.moveTo(heal_target)
            }
            return
        }
        let ret = evade_exit(creep)
        if (!ret){
            ret = evade_road(creep)
        }
        return
    }
}

function tower_act(tower){

    if (Memory.towers === undefined){
        Memory.towers = {}
    }
    if (Memory.towers[tower.id] === undefined){
        Memory.towers[tower.id] = {}
    }
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
    if (Memory.towers && Memory.towers[tower.id].damaged){
        let damaged_ = Game.getObjectById(Memory.towers[tower.id].damaged);
        if (spawn.is_damaged(damaged_)){
            tower.repair(damaged_);
            return
        } else {
            delete Memory.towers[tower.id].damaged
        }
    }
    if (damaged_half.length){
        let damaged_half_ = tower.pos.findClosestByRange(spawn.damaged_half);
        if (damaged_half_){
            tower.repair(damaged_half_);
            Memory.towers[tower.id].damaged = damaged_half_.id
            return;
        }
    }
}

idle_flag ={
    Spawn1: 'Flag1',
    Spawn2: 'Flag4',
    Spawn3: 'Flag5',
    Spawn4: 'Flag6',
}
function idle(creep){
    spawn.counters[creep.memory.spawn].idle += 1

    if ((creep.memory.expires_i || 0) < Game.time){
        creep.memory.expires_i = Game.time + 3
    }
    flag = Game.flags[idle_flag[creep.memory.spawn]];
    if (flag && !creep.pos.inRangeTo(flag,4)){
        creep.moveTo(flag, default_path_opts);
    }
    return;
}

function is_stock(s){
    return (s.structureType === STRUCTURE_CONTAINER ||
            s.structureType === STRUCTURE_STORAGE ||
            s.structureType === STRUCTURE_TERMINAL ) &&
            s.storeCapacity;
}

function near_build_flag(s) {
    return s && s.room && s.pos.findInRange(FIND_FLAGS, 4, {
        filter: (flag) => { return flag.color === COLOR_YELLOW; }
    }).length
}


function evade_exit(creep){
    if (creep.pos.x < 1){
        creep.move(RIGHT)
    } else if (creep.pos.y < 1){
        creep.move(BOTTOM)
    } else if (creep.pos.x >= 49){
        creep.move(LEFT)
    } else if (creep.pos.y >= 49){
        creep.move(TOP)
    } else {
        return OK
    }
    return -1
}

function evade_road(creep){
    let over_road = creep.pos.lookFor(LOOK_STRUCTURES);
    let pos = creep.room.getPositionAt(25,25)
    if (over_road.length && over_road[0]){
        if (!creep.pos.inRangeTo(pos,13)){
            creep.moveTo(pos)
        } else {
            let ret
            ret = creep.move(TOP)
            if (ret !== OK){
                ret = creep.move(BOTTOM)
            }
            if (ret !== OK){
                ret = creep.move(LEFT)
            }
            if (ret !== OK){
                ret = creep.move(RIGHT)
            }
        }
        return -1
    }
    return OK
}

spawn_to_link = {
    Spawn1: '57b81dcd2aaf9f94430da26f',
    Spawn2: '57c29e26d31a5f1d6767fdde',
}

function room_filled(spawn){
    return spawn_filled[spawn] &&
           tower_filled[spawn] &&
           link_filled[spawn]
}

function use_storage(s){
    return !room_filled(spawn.room_to_spawn[s.room.name]) ||
                s.store[RESOURCE_ENERGY] > 300E3
}

function update_stock(){
    let stock_ = find(FIND_STRUCTURES, {
        filter: is_stock,
    });
    stock = stock_.filter(spawn.my_rooms);
    Memory.stock_expires = Game.time + 50
}
console.log('reboot')
update_stock()

module.exports.loop = function () {

    energy = undefined;
    healer.update();
    claimer.update();
    spawn.update();

    if (Memory.stock_expires < Game.time){
        console.log('update_stock')
        update_stock()
    }
    /*
    if (memory.upgraders === undefined){
        memory.upgraders = {}
    }
    /*
    var rooms = ['W37S57','W39S59'];
    for (let i in rooms){
        let room = rooms[i];
        /*
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
    */

    let recycling = false;
    recharger_energy = 0;
    maintenance_count = 0;
    fillers = {Spawn1: 0,
               Spawn2: 0,
               Spawn3: 0,
               Spawn4: 0,
    };
    wanted = {};
    offered = {};
    recharger_tower_energy = {};
    let room = Game.rooms['W39S59']
    let spawns = ['Spawn1',
                  'Spawn2',
                  'Spawn3',
                  'Spawn4']
    spawn_filled = {}
    tower_filled = {}
    link_filled = {}
    let renewing = {}

    for (let i in spawns){
        let spawn = spawns[i]
        if (!Game.spawns[spawn]){
            continue
        }
        let room = Game.spawns[spawn].room;
        if (Memory.to_visit === undefined){
            Memory.to_visit = {}
        }
        if (Memory.room_filled === undefined){
            Memory.room_filled = {}
        }
        if (Memory.to_visit[spawn] === undefined){
            Memory.to_visit[spawn] = []
        }
        if (Memory.room_filled[spawn] === undefined){
            Memory.room_filled[spawn] = {}
        }
        spawn_filled[spawn] = room.energyAvailable >= 0.85 * room.energyCapacityAvailable;
        tower_filled[spawn] = true;
        link_filled[spawn] = true;
        let towers = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        })
        if (towers.length && towers[0]){
            for (let i in towers){
                let tower = towers[i]
                if (tower.energy < tower.energyCapacity - 100){
                    tower_filled[spawn] = false
                    break
                }
            }
        }
        let link = Game.getObjectById(spawn_to_link[spawn])
        if (link && link.energy < 650){
            link_filled[spawn] = false;
        }

        room_filled_transition = {}
        room_filled_transition[spawn] = (room_filled(spawn) && 1 || 0) - (Memory.room_filled[spawn] && 1 || 0)
        Memory.room_filled[spawn] = room_filled(spawn)
        room_filled_transition[spawn]

        let spawn_ = Game.spawns[spawn]
        if (!spawn_.spawning){
            let near = spawn_.pos.findInRange(FIND_MY_CREEPS, 1)
            if (near.length && near[0] !== undefined){
                for (let i in near){
                    spawn_.renewCreep(near[i]);
                }
            }

            renewing[spawn] = Game.getObjectById(Memory.renewing[spawn])
            if (renewing[spawn] && !renewing[spawn].has(CLAIM)){
                // console.log('renewing', renewing[spawn].name)
                let spawn_ = Game.spawns[spawn]
                if (!renewing[spawn].pos.isNearTo(spawn_)){
                    renewing[spawn].moveTo(spawn_)
                }
                spawn_.renewCreep(renewing[spawn])
                if (renewing[spawn].ticksToLive >= 1400){
                    delete Memory.renewing[spawn]
                }
            }
        }
    }

    let towers = _.filter(Game.structures, s => s.structureType === STRUCTURE_TOWER);
    for (let key in towers) {
        tower_act(towers[key]);
    }

    let links = _.filter(Game.structures, s => s.structureType === STRUCTURE_LINK);
    let sinks = {};
    let fountain = {};
    for (let key in links) {
        let link = links[key]
        if (!link.room){
            continue
        }
        if (sinks[link.room.name] === undefined){
            sinks[link.room.name] = []
        }
        if ((link.pos.x === 30 && link.pos.y === 12) ||
            (link.pos.x === 30 && link.pos.y === 11) ||
            (link.pos.x === 14 && link.pos.y === 8) ||
            (link.pos.x === 35 && link.pos.y === 8) ||
            (link.pos.x === 26 && link.pos.y === 16)){
            sinks[link.room.name].push(link);
        } else if ((link.pos.x === 3 && link.pos.y === 17) ||
                   (link.pos.x === 11 && link.pos.y === 13) ||
                   (link.pos.x === 20 && link.pos.y === 38)){
            fountain[link.room.name] = link;

        }
    }
    let fountain_busy = []
    for (let key in sinks){
        let fountain_ = fountain[key]
        for (let i in sinks[key]){
            let sink_ = sinks[key][i]
            if ( sink_ && fountain_ &&
                 Math.min((fountain_.energyCapacity -
                        fountain_.energy), sink_.energy) >= 600 &&
                 fountain_busy.indexOf(fountain_) === -1){
                        sink_.transferEnergy(fountain_);
                        fountain_busy.push(fountain_)
            }
        }
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
        filter: spawn.my_rooms,
    });
    for (let key in sources){
        let source = sources[key];
        let container = source.pos.findInRange(FIND_STRUCTURES, 2,{
            filter: is_stock
        });
        if (source.id === '579fa9050700be0674d2ea49'){
            continue
        }
        if (container.length && container[0] !== undefined){
            for (let i in container){
                if (container[i].structureType === STRUCTURE_STORAGE &&
                        !use_storage(container[i])){
                    container.splice(i,1)
                }
            }

            if (Memory.unwanted_structures !== undefined){
                container = container.filter(s => Memory.unwanted_structures.indexOf(s.id) === -1)
            }
            container_of_source[source.id] = container
            source_container = source_container.concat(container)
        }
        if (!_.some(container, has_space) &&
                container.length < 2 &&
                source.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2).length === 0) {
            let neighborhood = source.room.lookAtArea(source.pos.y - 1, source.pos.x - 1,
                                  source.pos.y + 1, source.pos.x + 1)
            let ret = -1;
            outer_for:
            for (let y_ in neighborhood){
                for (let x_ in neighborhood[y_]){
                    let tile = neighborhood[y_][x_];
                    let x = parseInt(x_)
                    let y = parseInt(y_)
                    if (!_.some(tile, {'type': 'terrain', 'terrain': 'wall'})){
                        let neighborhood = source.room.lookAtArea(y - 1, x - 1, y + 1, x + 1)
                        for (let y_ in neighborhood){
                            for (let x_ in neighborhood[y_]){
                                let tile = neighborhood[y_][x_];
                                let x = parseInt(x_)
                                let y = parseInt(y_)
                                if (source.pos.x === x && source.pos.y === y ||
                                    _.some(tile, {'type': 'terrain', 'terrain': 'wall'}) ||
                                    source.pos.isNearTo(x,y)){
                                        continue
                                }
                                if (!_.some(tile, s => s.type === 'structure' && is_stock(s))){
                                    ret = source.room.createConstructionSite(x, y, STRUCTURE_CONTAINER);
                                    if (ret === OK){
                                        console.log('constructing at', x, y)
                                        break outer_for
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    room1 = Game.rooms['W39S59'];
    room2 = Game.rooms['W37S57'];
    room3 = Game.rooms['W36S57'];
    room4 = Game.rooms['W35S58'];
    /*
    if (room1 && (Game.time % 50 === 2)){
        outer_for:
        for (let x=22; x>=16; x-=1){
            for (let y=0 + (x % 2); y<=10; y+=2){
                if ((x + y) % 2 === 0){
                    // let site = room1.getPositionAt(x, y).lookFor(LOOK_CONSTRUCTION_SITES)
                    // site = site && site.length && site[0]
                    // if (site){
                    //     site.remove()
                    // }
                    //room1.createConstructionSite(x, y-1, STRUCTURE_ROAD);
                    let ret = room1.createConstructionSite(x, y, STRUCTURE_EXTENSION);
                    if (ret === ERR_RCL_NOT_ENOUGH ||
                        ret === ERR_FULL){
                        //break outer_for
                    }
                    //room1.createConstructionSite(x, y+1, STRUCTURE_ROAD);
                }
            }
        }
    }
    if (room3 && (Game.time % 50 === 1)){
        outer_for:
        for (let x=36; x>=26; x-=1){
            for (let y=16 + (x % 2); y<=22; y+=2){
                if ((x + y) % 2 === 0){
                    //room3.createConstructionSite(x, y-1, STRUCTURE_ROAD);
                    let ret = room3.createConstructionSite(x, y, STRUCTURE_EXTENSION);
                    if (ret === ERR_RCL_NOT_ENOUGH ||
                        ret === ERR_FULL){
                        break outer_for
                    }
                    //room3.createConstructionSite(x, y+1, STRUCTURE_ROAD);
                }
            }
        }
    }
    */
    /*
    if (room4 && (Game.time % 50 === 1)){
        outer_for:
        for (let x=37; x<=41; x+=1){
            for (let y=38 + (x % 2); y>=22; y-=2){
                    console.log(x,y)
                if ((x + y) % 2 === 0){
                    // room4.createConstructionSite(x, y-1, STRUCTURE_ROAD);
                    // room4.createConstructionSite(x, y+1, STRUCTURE_ROAD);
                    // continue
                    let ret = room4.createConstructionSite(x, y, STRUCTURE_EXTENSION);
                    if (ret === ERR_RCL_NOT_ENOUGH ||
                        ret === ERR_FULL){
                        break outer_for
                    }
                }
            }
        }
    }
    */
    /*
    if (room2){
        room2.createConstructionSite(28, 18, STRUCTURE_STORAGE);
        room2.createConstructionSite(35, 26, STRUCTURE_TOWER);
        room2.createConstructionSite(22, 4, STRUCTURE_RAMPART);
        room2.createConstructionSite(47, 28, STRUCTURE_RAMPART);
        room2.createConstructionSite(33, 47, STRUCTURE_RAMPART);
        room2.createConstructionSite(43, 1, STRUCTURE_RAMPART);
        room2.createConstructionSite(22, 4, STRUCTURE_ROAD);
        room2.createConstructionSite(47, 28, STRUCTURE_ROAD);
        room2.createConstructionSite(33, 47, STRUCTURE_ROAD);
        room2.createConstructionSite(43, 1, STRUCTURE_ROAD);
    }
    */
    /*
    let enabled = false
    let erase = false
    if (enabled){
        let opts = {}
        Object.assign(opts, default_path_opts)
        opts.heuristicWeight = 10000;
        opts.ignoreCreeps = true;
        opts.ignoreRoads = true
        let c = Game.flags.c
        let d = c && c.room && c.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_ROAD,
            opts: opts,
        })
        let a = Game.flags.a;
        let b = Game.flags.b;
        //let vertices = [[a,b], [c,d]];
        //let vertices = [[a,b]];
        let vertices = [[c,d]];
        //let vertices = []
        for (let i in vertices){
            let a = vertices[i][0]
            let b = vertices[i][1]
            if (!a.room || !b.room){
                continue
            }
            let path = a.pos.findPathTo(b, opts)
            //path = [];
            for (let i in path){
                let tile = path[i];
                // console.log(tile.x,tile.y)
                if (erase){
                    let site = a.room.getPositionAt(tile.x, tile.y).lookFor(LOOK_CONSTRUCTION_SITES)
                    site = site && site.length && site[0]
                    if (site){
                        site.remove()
                    }
                } else if (enabled){
                    a.room.createConstructionSite(tile.x, tile.y,
                          STRUCTURE_ROAD);
                }
                // lets all be friends!! xD
            }
            if (a.pos){
                a.room.createConstructionSite(a.pos.x, a.pos.y,
                          STRUCTURE_ROAD);
            }
            if (b.pos){
                b.room.createConstructionSite(b.pos.x, b.pos.y,
                          STRUCTURE_ROAD);
            }
        }
    }
    */
    /*
    room.createConstructionSite(21, 9, STRUCTURE_EXTENSION);
    room.createConstructionSite(21, 5, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 4, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 8, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 10, STRUCTURE_EXTENSION);
    room.createConstructionSite(20, 6, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 7, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 9, STRUCTURE_EXTENSION);
    room.createConstructionSite(19, 5, STRUCTURE_EXTENSION);
    */


    for (let key in  Game.creeps){
        let creep = Game.creeps[key];
        let state = creep.memory.state;

        if (!creep.id){
            continue
        }

        if (creep.memory.recycle){
            recycling = true;
            let spawn_ = creep.pos.findClosestByRange(_.values(Game.spawns)) ||
                              Game.spawns.Spawn1;
            if (!creep.pos.isNearTo(spawn_)){
                creep.moveTo(spawn_)
            }
            spawn_.recycleCreep(creep);
            continue
        }
        let spawn_ = Game.spawns[creep.memory.spawn]
        if (creep === renewing[spawn_.name]){
            continue
        }
        if (creep.id && spawn.sum_cost(creep.body) > 900 &&
                !creep.has(CLAIM) &&
                creep.ticksToLive < 350 &&
                !renewing[spawn_.name] &&
                room_filled(creep.memory.spawn)){
            console.log('renewing', creep.name)
            if (!creep.pos.isNearTo(spawn_)){
                creep.moveTo(spawn_)
            }
            spawn_.renewCreep(creep)
            Memory.renewing[spawn_.name] = creep.id
            renewing[spawn_.name] = creep
            continue
        }

        if (typeof creep.memory.state !== 'string'){
            creep.memory.state = STATE_NULL;
        }
        if (creep.memory.role === 'carrier' ||
            creep.memory.role === 'worker' ){
            if ((!state || state === STATE_COLLECTING) &&
                    creep.carry[RESOURCE_ENERGY] >= (0.75 * creep.carryCapacity)){
                state = STATE_DELIVERING;
                creep.memory.state = state
            } else if (state === STATE_DELIVERING &&
                        ((creep.carry[RESOURCE_ENERGY] === 0))){
                        //((creep.carry[RESOURCE_ENERGY] === 0) ||
                            //(creep.memory.stock_done &&
                            //    creep.carry[RESOURCE_ENERGY] < (0.1 * creep.carryCapacity)))){
                //delete creep.memory.stock_done;
                state = STATE_COLLECTING;
                creep.memory.state = state
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
        } else if (creep.memory.role === 'harvester' ){
            pickup(creep);
            harvest(creep);
            continue
        } else if (creep.memory.role === 'visitor' ){
            if (creep.memory.target_room){
                if (creep.pos.roomName !== creep.memory.target_room){
                    creep.moveTo(new RoomPosition(25,25,creep.memory.target_room));
                } else {
                    Memory.to_visit[creep.memory.spawn].splice(
                            Memory.to_visit[creep.memory.spawn].indexOf(creep.memory.target_room), 1)
                    let ret = evade_exit(creep);
                    if (!ret){
                        ret = evade_road(creep);
                    }
                }
            }
            continue
        }

        let ret = -1;

        pickup(creep);

        if (Game.time < (creep.memory.expires_i || 0)){
            ret = idle(creep);
        }

        if (!state || state === STATE_COLLECTING ){
            if (ret){
                ret = procure(creep);
            }
            if (ret){
                ret = idle(creep);
            }
        } else if ( state === STATE_DELIVERING ){

            /*
            if (ret){
                ret = upgrade(creep, 3, 'W39S59');
            }
            if (ret){
                ret = upgrade(creep, 3, 'W37S57');
            }
            */
            if (ret){
                ret = upgrade(creep, 2, 'W35S58');
            }
            if (ret){
                ret = upgrade(creep, 2);
            }
            let dont_repair = !ret;
            /*
            if (ret){
                ret = goto_maintenance(creep, near_build_flag);
            }
            */
            if (ret){
                ret = goto_maintenance(creep);
            }
            if (!dont_repair){
                ret &= maintenance_near(creep);
            }
            if (ret){
                ret = upgrade(creep, 10);
            }
            if (ret){
                ret = recharge(creep);
            }
            if (ret){
                ret = recharge_tower(creep);
            }
            if (ret){
                ret = recharge_link(creep);
            }
            if (ret){
                ret = deposit(creep);
            }
            if (ret){
                // console.log('' + creep.name + ' in idle delivering')
                ret = idle(creep)
            }
        }
    }

    for (let name in Game.spawns){
        Game.spawns[name].act();
    }

    console.log('' + Object.keys(Game.creeps).length +
                //(role && (' s' + role) || '   ') +
                ' w' + _.sum(_.values(_.mapValues(spawn.counters, 'worker'))) +
                ' c' + _.sum(_.values(_.mapValues(spawn.counters, 'carrier'))) +
                //' h' + harvester_count +
                ' hw' + _.sum(_.values(_.mapValues(spawn.counters, 'harvester_work'))) +
                ' f' + _.sum(_.values(_.mapValues(spawn.counters, 'fighter'))) +
                ' he' + _.sum(_.values(_.mapValues(spawn.counters, 'healer'))) +
                ' cl' + _.sum(_.values(_.mapValues(spawn.counters, 'claimer'))) +
                ' v' + _.sum(_.values(_.mapValues(spawn.counters, 'visitor'))) +
                ' 1' + ((room_filled('Spawn1') && 'F') || '_') + (spawn.counters['Spawn1'].idle + 'i') +
                ' 2' + ((room_filled('Spawn2') && 'F') || '_') + (spawn.counters['Spawn2'].idle + 'i') +
                ' 3' + ((room_filled('Spawn3') && 'F') || '_') + (spawn.counters['Spawn3'].idle + 'i') +
                ' 4' + ((room_filled('Spawn4') && 'F') || '_') + (spawn.counters['Spawn4'].idle + 'i') +
                ' ' + Game.cpu.getUsed().toFixed(2));
}
