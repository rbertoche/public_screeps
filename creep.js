/*
 * Yay now i'm the bigga of em all
 */
 
var spawn = require('spawn')
healer = require('healer')

const CACHE_TIME_TO_LIVE = 11



Creep.prototype.cache_time_to_live = function (n){
    if (!n){
        n = 1
    }
    // A fixed cache time to live value may cause spikes when some creeps'
    // cache getting synchronized so that they try to find new targets from
    // time to time on the same ticks until they change state
    let salt = Number('0x' + this.id.slice(-1)) % 8
    return CACHE_TIME_TO_LIVE * n + salt
}


const default_path_opts = {
    ignoreCreeps: false,
    maxOps: 10000,
    serializePath: true,
    reusePath: 24,
    heuristicWeight: 1.2,
    //avoid: ['W35S57']
//    heuristicWeight: 1,
//    algorithm: 'astar',
}

Creep.prototype.toString = function () {
    return '[creep '+ this.name + '/' + this.id.slice(-6) + ']'
}

Creep.prototype.has = function (part){
    let ret;
    if (this.memory){
        if (this.memory.has === undefined){
            this.memory.has = {};
        }
        if (this.memory.has[part] === undefined){
            ret = this.body.filter(p => p.type === part).length;
            this.memory.has[part] = ret;
        } else {
            ret = this.memory.has[part];
        }
    } else {
        ret = this.body.filter(p => p.type === part).length;
    }
    return ret;
}

Creep.prototype.renewing = function (){
    return _.some(spawn.spawn_to_spawns[this.memory.spawn],
        spawn_name => this.id === Memory.renewing[spawn_name])
}

Creep.prototype.get_maintenance = function (){
    /*
    if (filter === undefined){
        filter = () => { return true }
    }
    let filter_
    if (!this.memory.roaming){
        filter_ = (s) => only_spawn_room(this)(s) && filter(s);
    } else {
        filter_ = filter
    }
    */
    let ret = Game.getObjectById(this.memory.maintenance);
    if (!ret || ret === undefined ||
                (!(ret.structureType !== undefined &&
                   ret.progress !== undefined)
                 && !spawn.is_damaged_down(ret))){
        let sites
        let priority_sites
        if (!this.memory.roaming){
            sites = spawn.sites[this.memory.spawn];
        } else {
            sites = _.filter(Game.constructionSites, s => s.room);
            priority_sites = _.filter(sites, s => s.structureType === STRUCTURE_SPAWN ||
                                                s.structureType === STRUCTURE_CONTAINER ||
                                                s.structureType === STRUCTURE_STORAGE ||
                                                s.structureType === STRUCTURE_EXTENSION ||
                                                s.structureType === STRUCTURE_TOWER ||
                                                s.structureType === STRUCTURE_LINK)
            sites = sites.concat(spawn.damaged_down())
        }
        ret = (priority_sites && priority_sites.length && this.pos.findClosestByRange(priority_sites))
                || this.pos.findClosestByRange(sites)
        if (!ret && sites.length){
            ret = sites[0];
        }
        if (ret){
            this.memory.maintenance = ret.id
        }
    }
    return ret;
}

Creep.prototype.get_near_maintenance = function(){
    let ret = this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3)
    let damaged_ = this.pos.findInRange(FIND_STRUCTURES, 3, {
        filter: spawn.is_damaged_half
    })
    ret = ret.concat(damaged_)
    ret = ret.length && ret[0];
    return ret
}

Creep.prototype.maintenance_near = function(){
    if (this.memory.role === 'worker'){
        let target = this.get_near_maintenance();
        if (target){
            let ret;
            if (target.progress !== undefined){
                ret = this.build(target);
            } else {
                ret = this.repair(target);
            }
            return ret;
        }
    }
    return -1;
}

Creep.prototype.goto_maintenance = function(){
    if (this.memory.role === 'worker'){
        let site = this.get_maintenance()
        if (site){
            enemies = this.pos.findInRange(FIND_HOSTILE_CREEPS, 4, {
                    filter: c => c.has(RANGED_ATTACK)
            })
            enemies_ = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3, {
                    filter: c => c.has(RANGED_ATTACK)
            })
            if (enemies.length === 0 || !enemies[0] ||
                    !this.pos.inRangeTo(site,3)){
                if(!this.pos.isNearTo(site)){
                    this.moveTo(site, default_path_opts);
                }
            } else if (enemies_.length && enemies_[0]){
                this.moveTo(Game.spawns[this.memory.spawn])
            }
            return;
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
    return s => s && spawn.my_rooms(s) &&
                    ((source_work_count[s.id] || 0) +
                        creep.has(WORK) <= 6) &&
                    s.id !== '579fa9050700be0674d2ea49' &&
                    tables.source_rooms()[creep.memory.spawn].
                            indexOf(s.room.name) !== -1;
}

const unwanted = [
    ]

Creep.prototype.harvest_ = function()
{
    if (this.memory.role === 'harvester'){
        let source = Game.getObjectById(this.memory.source)
        if (this.memory.source === undefined || !source_filter(this)(source)){
            source = find(FIND_SOURCES, {
                    filter: source_filter(this),
                })
            source = this.pos.findClosestByPath(source) || source.length && source[0];
            this.memory.source = source.id
            this.memory.source_pos = source.pos
        }
        let target = source;
        let containers, container
        if (source){
            containers = container_of_source[source.id];
            if (containers){
                containers = containers.filter(has_space)
                let links = containers.filter(s => s.structureType === STRUCTURE_LINK)
                if (links.length){
                    container = links[0]
                } else {
                    container = this.pos.findClosestByRange(containers) || containers[0] || containers.length
                }
            }

            if (source.room){
                let working = false;
                let hold = false;
                if (this.has(CARRY)){
                    let damaged_ = this.pos.findInRange(FIND_STRUCTURES, 1, {
                                filter: s => is_stock(s) && (s.hits < s.hitsMax),
                    });
                    damaged_ = damaged_.concat(this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2))
                    /*
                    if (Memory.unwanted_structures !== undefined){
                        damaged_ = damaged_.filter(s => Memory.unwanted_structures.indexOf(s.id) === -1)
                    }*/
                    damaged_ = damaged_.filter(_.negate(spawn.look_for_flag(COLOR_BROWN)))
                    if (damaged_.length){
                        let ret
                        if (this.carry[RESOURCE_ENERGY] < this.has(WORK) * 5){
                            hold = true;
                        } else if (damaged_[0].progressTotal){
                            ret = this.build(damaged_[0])
                        } else {
                            ret = this.repair(damaged_[0], RESOURCE_ENERGY);
                        }
                        working = ret === OK;
                    }
                }
                let pos
                if (container && this.has(CARRY)){
                    if (source.id in Memory.source_pos){
                        pos = new RoomPosition(
                            Memory.source_pos[source.id].x,
                            Memory.source_pos[source.id].y,
                            Memory.source_pos[source.id].roomName)
                    }
                    if (!pos || this.pos.isEqualTo(pos) && (!this.pos.isNearTo(container) || 
                                                            !this.pos.isNearTo(source))){
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
                            let target = this.pos.findClosestByRange(intersection) || intersection.length && intersection[0]
                            pos = source.room.getPositionAt(target % 100, Math.floor(target / 100));
                        } else {
                            console.log('Error at source container', container, container.pos)
                        }
                        Memory.source_pos[source.id] = pos
                    }
                } else {
                    pos = source.pos
                }
                if (!working){
                    this.harvest(source)
                    if (!hold && container){
                        this.transfer(container, RESOURCE_ENERGY)
                    }
                }
                if (!this.pos.isEqualTo(pos)){
                    if (this.memory._move && !this.memory._move.path){
                        delete this.memory._move
                    }
                    this.moveTo(pos, default_path_opts);
                }
                source_work_count[source.id] = (source_work_count[source.id] || 0) + this.has(WORK);
                return;

            } else if (this.memory.source_pos !== undefined){
                this.moveTo(new RoomPosition(
                    this.source_pos.x,
                    this.source_pos.y,
                    this.source_pos.roomName))
            }
        } else {
            /* Just waiting for the visitor is working better
             * if harvesters had target_rooms, we could get something like
             * this visit code to work
             */
            for (let i in tables.source_rooms()[this.memory.spawn]){
                var name = tables.source_rooms()[this.memory.spawn][i]
                if (Game.rooms[name] === undefined){
                    this.moveTo(new RoomPosition(25,25, name, default_path_opts));
                    return
                }
            }
            console.log(this.name, 'at', this.pos, 'cant find source')
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
                + (wanted[s.id] || 0) + (s.storeCapacity || s.energyCapacity) >= (space || 5);
}

function has_some_space(s){
    return has_space(s, 40)
}

function stock_filter(creep, to_other_room){
    // TODO: Permitir usar source_containers como source condicionalmente
    return s => s && has_space(s) && (Game.spawns[creep.memory.spawn].room.name === s.room.name ||
                                        to_other_room) &&
                                        (!s.pos.findInRange(FIND_SOURCES, 2).length ||
                                            (s.id === '57b48aac2231a7092e38520b' &&
                                                true))
                                                //!use_storage(s)))
}

storage_1 = Game.getObjectById('57b48aac2231a7092e38520b')

Creep.prototype.deposit = function (force)
{
    if (this.has(CARRY)){
        if (!this.memory.roaming && !spawn.room_filled(this.memory.spawn) && !force){
            return -1;
        } else if (force){
            console.log(this.name, 'forcing deposit')
        }

        let stock_ = this.memory.stock !== undefined && memory.get(this.memory, 'stock');
        if (this.memory.stock === undefined || !stock_filter(this)(stock_)){
            stock_ = stock.filter(stock_filter(this));
            stock_ = stock_.filter(s => this.memory.energy_from !== s.id)
            // No Spawn1 os harvester trasnferem pro storage
            if (this.memory.spawn === 'Spawn1' &&
                    stock_.length === 0 &&
                    this.memory.role === 'carrier' &&
                    this.memory.roaming &&
                    storage_1 &&
                    (force || !use_storage(storage_1))){
                if (storage_1){
                    stock_.push(storage_1)
                }
                //stock_ = stock.filter(stock_filter(this, true));
                //stock_ = stock_.filter(s => this.memory.energy_from !== s.id);
            }

            //}
            stock_ = this.pos.findClosestByRange(stock_) || (stock_.length && stock_[0]);
            memory.set(this.memory, 'stock', stock_);
        }
        if (stock_){
            if (!this.pos.isNearTo(stock_)){
                this.moveTo(stock_, default_path_opts)
            } //else {
                //this.memory.stock_done = true;
            //}
            this.transfer(stock_, RESOURCE_ENERGY);
            offered[stock_.id] = (offered[stock_.id] || 0) + this.carry[RESOURCE_ENERGY];
            return;
        } else {
            delete this.memory.stock;
        }
    }
    return -1;
}

// TODO: cache
Creep.prototype.get_structures = function(type, filter){
    return _.filter(Game.structures, s => (!type || s.structureType === type) && (filter === undefined || filter(s)) );
}

Creep.prototype.get_structure = function(type, filter){
    let ret = this.get_structures(type, filter);
    return this.pos.findClosestByRange(ret) || (ret.length && ret[0]) || null;
}

function tower_filter(creep){
    return s => has_space(s, 120) &&
                    Game.spawns[creep.memory.spawn].room.name === s.room.name;
}

Creep.prototype.recharge_tower = function()
{
    if (this.has(CARRY) &&
            this.room.name === Game.spawns[this.memory.spawn].room.name){
        let target = Game.getObjectById(this.memory.tower)
        if (this.memory.tower === undefined ||
                spawn.room_filled_transition[this.memory.spawn] ||
                (target !== null && !tower_filter(this)(target)) ||
                (this.memory.expires_t || 0) < Game.time){
            target = this.get_structure(STRUCTURE_TOWER, tower_filter(this))
            if (target){
                this.memory.tower = target.id
            } else {
                this.memory.tower = null
            }
            this.memory.expires_t = Game.time + this.cache_time_to_live()
        }
        if (target && (offered[target.id] || 0) <
                (target.energyCapacity - target.energy)){
            if (!this.pos.isNearTo(target)){
                this.moveTo(target, default_path_opts);
            }
            let ret = this.transfer(target, RESOURCE_ENERGY);
            offered[target.id] = (offered[target.id] || 0) + this.carry[RESOURCE_ENERGY];
            if ((offered[target.id] || 0) >
                    (target.energyCapacity - target.energy)){
                spawn.tower_filled()[this.memory.spawn] = true;
            }
            //if (ret === OK){
                //this.memory.stock_done = true
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
                                    s.id !== '57d2f495d6eac16a7294db44' &&
                                    s.id !== '57da20f48e9ccf7c4ad84e0f'
}

Creep.prototype.recharge_link = function()
{
    if (this.has(CARRY) &&
            this.room.name === Game.spawns[this.memory.spawn].room.name){
        let target = Game.getObjectById(this.memory.link)
        if (this.memory.link === undefined ||
                spawn.room_filled_transition[this.memory.spawn] ||
                (target !== null && !link_filter(this)(target)) ||
                (this.memory.expires_l || 0) < Game.time){
            target = this.get_structure(STRUCTURE_LINK, link_filter(this))
            if (target){
                this.memory.link = target.id
            } else {
                this.memory.link = null
            }
            this.memory.expires_l = Game.time + 4
        }
        if (target){
            if (!this.pos.isNearTo(target)){
                this.moveTo(target, default_path_opts);
            }
            let ret = this.transfer(target, RESOURCE_ENERGY);
            offered[target.id] = (offered[target.id] || 0) + this.carry[RESOURCE_ENERGY];
            if ((offered[target.id] || 0) >
                    (target.energyCapacity - target.energy)){
                spawn.link_filled()[this.memory.spawn] = true;
            }
            //if (ret === OK){
                //this.memory.stock_done = true
            //}
            return;
        }
    }
    return -1;
}

function recharge_filter(creep){
    return s => s && (s.structureType === STRUCTURE_SPAWN ||
                s.structureType === STRUCTURE_EXTENSION) &&
            (s.id !== this.memory.recharge ||
                (this.memory.expires_r || 0) < Game.time) &&
            creep.pos.inRangeTo(s, 18) &&
            has_space(s, 20) &&
            s.isActive() &&
            Game.spawns[creep.memory.spawn].room.name === s.room.name
}

Creep.prototype.recharge = function()
{
    if (this.has(CARRY) &&
            this.room.name === Game.spawns[this.memory.spawn].room.name){
        let target = Game.getObjectById(this.memory.recharge)
        if (this.memory.recharge === undefined ||
                spawn.room_filled_transition[this.memory.spawn] ||
                (target !== null && !recharge_filter(this)(target)) ||
                (this.memory.expires_r || 0) < Game.time){
            target = this.get_structure(null, recharge_filter(this))
            if (target){
                this.memory.recharge = target.id
            } else {
                this.memory.recharge = null
            }
            this.memory.expires_r = Game.time + this.cache_time_to_live()
        }
        if (target){
            if (!this.pos.isNearTo(target)){
                this.moveTo(target, default_path_opts);
            }
            this.transfer(target, RESOURCE_ENERGY);
            offered[target.id] = (offered[target.id] || 0) + this.carry[RESOURCE_ENERGY];
            return;
        }
    }
    return -1;
}

Creep.prototype.pickup_ = function(){
    if (this.has(CARRY)){
        let energy_ = this.pos.findInRange(FIND_DROPPED_ENERGY, 1);
        if (energy_.length){
            this.pickup(energy_[0]);
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
                cutoff = 25
            } else {
                amount = (s.store !== undefined && s.store[RESOURCE_ENERGY]) || s.energy || 0
                key = s.id
                if (s.structureType === STRUCTURE_LINK){
                    cutoff = 0
                } else {
                    cutoff = 80
                }
            }
            return spawn.my_rooms(s) && 
                        ((s.structureType !== STRUCTURE_STORAGE &&
                            s.structureType !== STRUCTURE_TERMINAL) ||
                            amount > 50000 || 
                            s.room.name === Game.spawns[creep.memory.spawn].room.name) &&
                    amount - (wanted[key] || 0) > cutoff
                    //amount + (offered[key] || 0) - (wanted[key] || 0) > cutoff
            /*
            return spawn.my_rooms(s) && (s.id === '57d08adbd208131769567049' ||
                            !(s.structureType === STRUCTURE_STORAGE) ||
                            (use_storage(s) &&
                                s.room.name === Game.spawns[creep.memory.spawn].room.name &&
                                !creep.memory.roaming)) &&
                        amount + (offered[key] || 0) - (wanted[key] || 0) > cutoff
            */
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

Creep.prototype.procure = function(){
    if (this.has(CARRY)){
        let target
        let cache_expired = (this.memory.expires_p || 0) < Game.time
        if (this.memory.procure === undefined ||
                !procure_filter(this)(Game.getObjectById(this.memory.procure)) ||
                cache_expired){
            let stock_ = [], source_container_, source_container__;
            if (this.memory.role === 'worker'){
                stock_ = stock.filter(procure_filter(this));
                // stock_ = stock_.filter(only_spawn_room(this))
            }
            source_container_ = source_container.filter(procure_filter(this));
            /*
            if (this.memory.role === 'carrier'){
                stock_ = stock_.filter(only_spawn_room(this))
            }
            */
            let energy_
            if (energy === undefined){
                energy_ = find(FIND_DROPPED_ENERGY, {
                    filter: procure_filter(this)
                });
            }
            if (this.memory.roaming && this.memory.role === 'carrier'){
                source_container_ = source_container_.filter(
                            s => tables.procure_rooms()[this.memory.spawn].indexOf(s.room.name) !== -1);
                energy_ = energy_.filter(
                            s => tables.procure_rooms()[this.memory.spawn].indexOf(s.room.name) !== -1);
            }
            
            if (((!spawn.room_filled(this.memory.spawn)) ||
                            (this.memory.role === 'carrier' &&
                                !this.memory.roaming)) &&
                        energy_.length === 0 &&
                        source_container_.length === 0){
                stock_ = stock.filter(procure_filter(this))
                stock_ = stock_.filter(only_spawn_room(this))
            }

            let targets = energy_.concat(stock_, source_container_)

            if (this.memory.role === 'worker'){
                let link = this.get_structure(STRUCTURE_LINK);
                if (link && procure_filter(this)(link)){
                    if (this.pos.inRangeTo(link,3)){
                        targets = [link];
                    } else {
                        targets.push(link);
                    }
                }
                /* Why??!
                let targets_here = targets.filter(s => s && s.room.name === this.room.name)
                if (targets_here.length && targets_here[0]){
                    targets = targets_here
                } 
                */
                //console.log(' 1 ' + targets)
            }
            if (!this.memory.roaming){
                targets = targets.filter(only_spawn_room(this))
            }

            if (!target){
                target = this.pos.findClosestByRange(targets);
            }
            if (!target && targets.length){
                /* Desativado por ser meio redundante com o procure_rooms_table
                let priority_targets = priority_procure_targets[this.memory.spawn]
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
                this.memory.procure = target.id;
                if (this.memory.role === 'worker'){
                    this.memory.expires_p = Game.time + this.cache_time_to_live()
                } else {
                    this.memory.expires_p = Game.time + this.cache_time_to_live(3)
                }
            } else {
                return -1
            }
        } else {
            target = Game.getObjectById(this.memory.procure);
        }
        if (!this.pos.isNearTo(target)){
            this.moveTo(target, default_path_opts)
        }
        let ret;
        let key;
        let amount = target.energy || target.amount || (target.store && target.store[RESOURCE_ENERGY])
        if (target.amount !== undefined){
            ret = this.pickup(target);
            key = energy_key(target);
            target = target.pos
        } else {
            ret = this.withdraw(target, RESOURCE_ENERGY);
            key = target.id
        }
        if (target){
            let space_left = (this.carryCapacity - this.carry[RESOURCE_ENERGY])
            wanted[key] = (wanted[key] || 0) + Math.min(amount, space_left);
        }
        if (ret === OK){
            delete this.memory.procure;
            this.memory.energy_from = target.id;
        }
        return
    }
    return -1;
}

default_max_upgraders = 99

max_upgraders_table = {
    W33S58: 1,
}


Creep.prototype.upgrade = function(lvl, room_name)
{
    lvl = lvl || 11;
    let room
    if (room_name === undefined){
        room = Game.spawns[this.memory.spawn].room
    } else if (typeof room_name === 'string'){
        room = Game.rooms[room_name]
        if (room === undefined){
            console.log('Error: room', room_name, 'not found')
            return -1;
        }
    }
    let controller = room.controller
    if (this.memory.role === 'worker' &&
            controller &&
            (upgraders[controller.id] || 0) < 
                (max_upgraders_table[room.name] || default_max_upgraders) &&
            //(memory.upgraders[room].length < 2 ||
            // memory.upgraders[room].indexOf(this.id) !== -1) &&
            (controller.level < lvl ||
                controller.ticksToDowngrade < 3000)){
        // console.log(this.name, controller.id)
        upgraders[controller.id] = (upgraders[controller.id] || 0 ) + 1
        if (!this.pos.isNearTo(controller)){
            //let opts = {}
            //Object.assign(opts, default_path_opts)
            //opts.ignoreCreeps = true;
            //this.moveTo(5, 16, opts);
            //this.moveTo(controller, opts);
            //if (memory.upgraders[room].indexOf(this.id) === -1){
            //    memory.upgraders[room].push(this.id)
            //}
            this.moveTo(controller, default_path_opts);
        }
        this.upgradeController(controller);
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


Creep.prototype.move_by_room_path = function(path){
    // O ideal seria um dicionario e incluir posicoes x y arbitrarias nos
    // valores, ja que
    // - não é necessário que cada sala aponte para a próxima
    // - escolher os pontos pode deixar os caminhos mais curtos
    let index = path.indexOf(this.pos.roomName)
    if (index === -1){
        index = 0;
    } else {
        index += 1
    }
    if (index === path.length){
        index = 0
    }
    let pos = new RoomPosition(25, 25, path[index])
    this.moveTo(pos)
}


Creep.prototype.fight = function(){

    let target_room = (this.memory.target_room || 'W34S58');
    let healing_room = 'W35S58'
    //let healing_room = 'W37S57'
    //let healing_room = Game.spawns[this.memory.spawn].room.name
    /*
    let attack_path = attack_paths[target_room];
    let healing_room = (attack_path.length > 1 && attack_path[attack_path.length - 2]) || 'W39S59';
    let was_hit = this.hits < (this.memory.hits || 0);
    this.memory.hits = this.hits
    */

    /*
    if (nearFlag === undefined){
        nearFlag = Game.flags.Flag3 && Game.flags.Flag3.room && Game.flags.Flag3.pos.findInRange(FIND_MY_CREEPS, 5, {
            filter: c => c.has(ATTACK),
        });
    }
    if ((Game.time - (Memory.fighter_barrier || 0) < 200 ) && Game.flags.Flag3 && Game.flags.Flag3.room && Game.flags.Flag3.pos.roomName === this.pos.roomName &&
            nearFlag.length < fighters_quota){
        if (!this.pos.inRangeTo(Game.flags.Flag3, 5)){
            this.moveTo(Game.flags.Flag3);
        }
        return;
    } else {
        Memory.fighter_barrier = Game.time
    }
    */

    /*
    if (this.pos.roomName === target_room ||
        this.pos.roomName === healing_room){
        if ( this.memory.state === STATE_DELIVERING &&
                    this.hits <= this.hitsMax * 0.9 ){
            console.log(this.name, 'retreting')
            this.memory.state = STATE_COLLECTING;
        } else if ( (this.memory.state == STATE_NULL ||
                     this.memory.state === STATE_COLLECTING ) &&
                         this.hits === this.hitsMax && !heal_target ){
            this.memory.state = STATE_DELIVERING;
            console.log(this.name, 'moving forward')
        }
        if (this.memory.state === STATE_DELIVERING) {
            console.log('del')
            let enemy_structure = this.room.find(FIND_HOSTILE_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER,
            });
            if (!enemy_structure.length){
                enemy_structure = this.room.find(FIND_HOSTILE_SPAWNS);
            }
            if (enemy_structure.length){
                let path = this.pos.findPathTo(enemy_structure[0]);
                if (!path){
                    let opts = {}
                    Object.assign(opts, default_path_opts)
                    opts.ignoreDestructibleStructures = true;
                    this.moveTo(enemy_structure[0], opts);
                } else {
                    this.moveByPath(path);
                }
                return
            }
        } else if (this.memory.state == STATE_NULL ||
              this.memory.state === STATE_COLLECTING){
            console.log('col')
            let pos = new RoomPosition(25, 25, healing_room);
            if (!this.pos.inRangeTo(pos,22)){
                let opts = {}
                Object.assign(opts, default_path_opts)
                opts.ignoreDestructibleStructures = true;
                this.moveTo(pos, opts);
            }
            return
        }
    }
    */
    let heal_target
    let enemy
    let target_enemy
    let pos = new RoomPosition(25, 25, target_room)

    // TODO: decent ally code
    // with damage detection blacklisting
    enemy = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: c => c.owner.username !== 'Muddal',
        // &&
        //            (!c.has(WORK) || c.has(ATTACK) || c.has(HEAL) || c.has(RANGED_ATTACK)),
    });

    if (!enemy){
        heal_target = this.pos.findClosestByRange(
                          healer.heal_targets()[this.pos.roomName]) ||
                          healer.heal_targets_all().length && healer.heal_targets_all()[0]
    }
    if (!enemy && !heal_target){
        if (Game.rooms[target_room] !== undefined){
            target_enemy = Game.rooms[target_room].find(FIND_HOSTILE_CREEPS)
            if (target_enemy.length){
                pos = target_enemy[0].pos
            }
        }
    }
    let ret
    //if (this.has(HEAL) && heal_target) {
    if (this.has(HEAL) && heal_target && !this.pos.isNearTo(enemy)){
        if (this.pos.isNearTo(heal_target)){
            ret = this.heal(heal_target)
        } else {
            ret = this.rangedHeal(heal_target)
        }
    }
    // TODO: Detect damage and add a blacklist to attack anywhere
    if (enemy && spawn.my_rooms(this)){
        console.log('enemy')
        if (!this.pos.isNearTo(enemy)){
            this.moveTo(enemy, default_path_opts);
        } else {
        // Maybe consider how much damage in the heal target?
        //} else if(ret !== OK) {
            this.attack(enemy)
        }
        return
    } else if (hostile_creeps && hostile_creeps.length){
        enemy = hostile_creeps[0]
        console.log('hostile creep there at ', enemy.pos)
        if (!this.pos.isNearTo(enemy)){
            this.moveTo(enemy, default_path_opts);
        } else {
        // Maybe consider how much damage in the heal target?
        //} else if(ret !== OK) {
            this.attack(enemy)
        }
        return
    } else if (!this.pos.inRangeTo(pos, 23) && !this.memory.done){

        /*
        let index = attack_path.indexOf(this.pos.roomName)
        if (index === -1){
            index = 0;
        } else {
            index += 1;
        }
        */
        //this.moveByPath(this.pos.findPathTo(pos, default_path_opts));

        //let opts = {}
        //Object.assign(opts, default_path_opts)
        //opts.ignoreDestructibleStructures = true;
        //this.moveTo(pos, opts)
        this.moveTo(pos, default_path_opts)

    } else {
        this.memory.done = true
        if (this.has(HEAL) && heal_target) {
            if (!this.pos.isNearTo(heal_target)){
                this.moveTo(heal_target)
            }
            return
        }
        let ret = this.evade_exit()
        if (!ret){
            ret = this.evade_road()
        }
        return
    }
}

idle_flag ={
    Spawn1: 'Flag1',
    Spawn2: 'Flag4',
    Spawn3: 'Flag5',
    Spawn4: 'Flag6',
    Spawn5: 'Flag3',
    Spawn7: 'Flag7',
}
Creep.prototype.idle = function(){
    if ((this.memory.expires_i || 0) < Game.time){
        this.memory.expires_i = Game.time + this.cache_time_to_live(2)
    }
    if (this.memory.role !== 'carrier'){
        let message = this.memory.role + ' ' + this.name + ' at ' + this.pos +
                        ' from spawn ' + this.memory.spawn + ' is idle\n'
        console.log(message)
        if (this.memory.role === 'worker'){
            spawn.counters[this.memory.spawn].idle_workers += 1
        }
        // Game.notify(message, 50)
    }
    if (!this.memory.state || this.memory.state === 'delivering'){
        // Idle delivering na verdade significa que não há onde
        // colocar a energia que o creep está carregando.
        ret = this.deposit(true)
        if (ret){
            console.log(this.name, 'the' , this.memory.role, 'at', this.pos, 'has nowhere to put his carry', JSON.stringify(this.carry))
            // Aqui estamos de fato idle, pois não há o que fazer com o carry
            spawn.counters[this.memory.spawn].idle_delivering += 1
        }
    } else if (this.memory.state === 'collecting'){
        // Aqui estamos idle por não achar energia
        spawn.counters[this.memory.spawn].idle += 1
        flag = Game.flags[idle_flag[this.memory.spawn]];
        if (flag && !this.pos.inRangeTo(flag,4)){
            this.moveTo(flag, default_path_opts);
        }
    } else {
        console.log(this.name, 'at', this.pos, 'at state', this.memory.state, 'is idle... ?!?!?')
    }
    return;
}

function is_stock(s){
    return s.storeCapacity// && !spawn.look_for_flag(COLOR_BROWN, s)
}

function near_build_flag(s) {
    return s && s.room && s.pos.findInRange(FIND_FLAGS, 4, {
        filter: (flag) => { return flag.color === COLOR_YELLOW; }
    }).length
}


Creep.prototype.evade_exit = function(){
    if (this.pos.x < 1){
        this.move(RIGHT)
    } else if (this.pos.y < 1){
        this.move(BOTTOM)
    } else if (this.pos.x >= 49){
        this.move(LEFT)
    } else if (this.pos.y >= 49){
        this.move(TOP)
    } else {
        return OK
    }
    return -1
}

Creep.prototype.evade_road = function(){
    return -1
    let over_road = this.pos.lookFor(LOOK_STRUCTURES);
    // _.negate(_.matches({'type': 'terrain', 'terrain': 'wall'}))
    // let n = this.room.lookAtArea(this.pos.y - 1, this.pos.x - 1,
    //                              this.pos.y + 1, this.pos.x + 1)
    // _.remove(n, s => _.some(s, {'type': 'terrain', 'terrain': 'wall'}) || 
    //                     _.some(s, {'type': 'structure', 'structure': {'structureType': STRUCTURE_WALL}}))
    let pos = this.room.getPositionAt(25,25)
    if (over_road.length && over_road[0]){
        if (!this.pos.inRangeTo(pos,13)){
            this.moveTo(pos)
        } else {
            let ret
            ret = this.move(TOP)
            if (ret !== OK){
                ret = this.move(BOTTOM)
            }
            if (ret !== OK){
                ret = this.move(LEFT)
            }
            if (ret !== OK){
                ret = this.move(RIGHT)
            }
        }
        return -1
    }
    return OK
}

function use_storage(s){
    return !spawn.room_filled(spawn.room_to_spawn[s.room.name]) ||
                s.store[RESOURCE_ENERGY] > 800E3
}

function update() {
    wanted = {}
    offered = {}
    upgraders = {}
    source_work_count = {}
    container_of_source = {};
    source_container = [];
    hostile_creeps = find(FIND_HOSTILE_CREEPS)
    hostile_creeps = hostile_creeps.filter(spawn.my_rooms)
    let sources = find(FIND_SOURCES, {
        filter: spawn.my_rooms,
    });
    for (let key in sources){
        let source = sources[key];
        let container = source.pos.findInRange(FIND_STRUCTURES, 2,{
            //filter: is_stock,
            filter: s => is_stock(s) || s.structureType === STRUCTURE_LINK,
        });
        if (source.id === '579fa9050700be0674d2ea49'){
            continue
        }
        if (Memory.source_pos === undefined){
            Memory.source_pos = {}
        }
        if (container.length && container[0] !== undefined){
            /*
            if (Memory.unwanted_structures !== undefined){
                container = container.filter(s => Memory.unwanted_structures.indexOf(s.id) === -1)
            }*/
            /*
            for (let i in container){
                if (container[i].structureType === STRUCTURE_STORAGE &&
                        !use_storage(container[i])){
                    container.splice(i,1)
                    console.log('use', container[i], 'at', container[i]&& container[i].pos)
                }
            }
            */

            container_of_source[source.id] = container
            source_container = source_container.concat(container)
        }
        if (Game.time % 50 === 7 &&
                !_.some(container, has_space) &&
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
                                    console.log('should create container at', source.room, x, y)
                                    //ret = source.room.createConstructionSite(x, y, STRUCTURE_CONTAINER);
                                    if (ret === OK){
                                        console.log('constructing at', x, y, source.room.name)
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
}

module.exports = {
    update: update,

    is_stock: is_stock,
    has_space: has_space,
    use_storage: use_storage,
    default_path_opts: default_path_opts,

}

