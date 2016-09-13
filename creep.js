/*
 * creep helper code
 */
var spawn = require('spawn')
healer = require('healer')

const CACHE_TIME_TO_LIVE = 8

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
        if (!this.memory.roaming){
            sites = spawn.sites[this.memory.spawn];
        } else {
            sites = _.filter(Game.constructionSites, s => s.room);
            sites = sites.concat(spawn.damaged_down)
        }
        ret = this.pos.findClosestByRange(sites);
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
        filter: spawn.is_damaged
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

Creep.prototype.harvest_ = function()
{
    if (this.memory.role === 'harvester'){
        let source = Game.getObjectById(this.memory.source)
        if (this.memory.source === undefined || !source_filter(this)(source)){
            delete this.memory.source
            source = find(FIND_SOURCES, {
                    filter: source_filter(this),
                })
            source = this.pos.findClosestByPath(source) || source.length && source[0];
            this.memory.source = source.id
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
            if (this.has(CARRY)){
                let damaged_ = this.pos.findInRange(FIND_STRUCTURES, 1, {
                            filter: s => is_stock(s) && (s.hits < s.hitsMax),
                });
                damaged_ = damaged_.concat(this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 2))
                if (Memory.unwanted_structures !== undefined){
                    damaged_ = damaged_.filter(s => Memory.unwanted_structures.indexOf(s.id) === -1)
                }
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
            if (container && this.has(CARRY) ){
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

        } else {
            /* Just waiting for the visitor is working better
             * if harvesters had target_rooms, we could get something like
             * this visit code to work
             */
            for (let i in spawn.source_rooms_table[this.memory.spawn]){
                var name = spawn.source_rooms_table[this.memory.spawn][i]
                if (Game.rooms[name] === undefined){
                    this.moveTo(new RoomPosition(25,25, name, default_path_opts));
                    return
                }
            }
            /*
            if (!this.pos.inRangeTo(Game.flags.Flag1, 4)){
                this.moveTo(Game.flags.Flag1, default_path_opts);
            }
            */
            console.log(this.name, 'at', this.pos, 'cant find source')
        }
    }
    return -1;
}

Creep.prototype.goto_maintenance = function(){
    if (this.memory.role === 'worker'){
        let site = this.get_maintenance()
        if (site){
            enemies = this.pos.findInRange(FIND_HOSTILE_CREEPS, 4)
            enemies_ = this.pos.findInRange(FIND_HOSTILE_CREEPS, 3)
            if ((enemies.length === 0 || !enemies[0])){
                if(!this.pos.isNearTo(site)){
                    this.moveTo(site, default_path_opts);
                }
            } else if (enemies_.length && enemies_[0]){
                this.moveTo(this.room.getPositionAt(25,25))
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

Creep.prototype.deposit = function ()
{
    if (this.has(CARRY)){
        if (!this.memory.roaming && !room_filled(this.memory.spawn)){
            return -1;
        }

        let stock_ = this.memory.stock !== undefined && memory.get(this.memory, 'stock');
        if (this.memory.stock === undefined || !stock_filter(this)(stock_)){
            stock_ = stock.filter(stock_filter(this));
            //if (!to_storage){
            stock_ = stock_.filter(s => this.memory.energy_from !== s.id);
            if (stock_.length === 0 && this.memory.spawn === 'Spawn1' &&
                                        this.memory.role === 'carrier' &&
                                        this.memory.roaming){
                stock_ = stock.filter(stock_filter(this, true));
                stock_ = stock_.filter(s => this.memory.energy_from !== s.id);
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
    return s => has_some_space(s) &&
                    Game.spawns[creep.memory.spawn].room.name === s.room.name;
}

Creep.prototype.recharge_tower = function()
{
    if (this.has(CARRY)){
        let target = Game.getObjectById(this.memory.tower)
        if (this.memory.tower === undefined ||
                room_filled_transition[this.memory.spawn] ||
                (target !== null && !tower_filter(this)(target)) ||
                (this.memory.expires_t || 0) < Game.time){
            target = this.get_structure(STRUCTURE_TOWER, tower_filter(this))
            if (target){
                this.memory.tower = target.id
            } else {
                this.memory.tower = null
            }
            this.memory.expires_t = Game.time + CACHE_TIME_TO_LIVE
        }
        if (target && (recharger_tower_energy[target.id] || 0) < (target.energyCapacity - target.energy)){
            if (!this.pos.isNearTo(target)){
                this.moveTo(target, default_path_opts);
            }
            recharger_tower_energy[target.id] = (recharger_tower_energy[target.id] || 0) + this.carry[RESOURCE_ENERGY];
            let ret = this.transfer(target, RESOURCE_ENERGY);
            offered[target.id] = (offered[target.id] || 0) + this.carry[RESOURCE_ENERGY];
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
                                    s.id !== '57d2f495d6eac16a7294db44'
}

Creep.prototype.recharge_link = function()
{
    if (this.has(CARRY)){
        let target = Game.getObjectById(this.memory.link)
        if (this.memory.link === undefined ||
                room_filled_transition[this.memory.spawn] ||
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
            creep.pos.inRangeTo(s, 18) &&
            has_space(s) &&
            s.isActive() &&
            Game.spawns[creep.memory.spawn].room.name === s.room.name
}

Creep.prototype.recharge = function()
{
    if (this.has(CARRY)){
        let target = Game.getObjectById(this.memory.recharge)
        if (this.memory.recharge === undefined ||
                room_filled_transition[this.memory.spawn] ||
                (target !== null && !recharge_filter(this)(target)) ||
                (this.memory.expires_r || 0) < Game.time){
            target = this.get_structure(null, recharge_filter(this))
            if (target){
                this.memory.recharge = target.id
            } else {
                this.memory.recharge = null
            }
            this.memory.expires_r = Game.time + CACHE_TIME_TO_LIVE
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

Creep.prototype.procure = function(){
    if (this.has(CARRY)){
        let target
        let cache_expired = (this.memory.expires_p || 0) < Game.time
        if (this.memory.procure === undefined ||
                !procure_filter(this)(Game.getObjectById(this.memory.procure)) ||
                cache_expired){
            let targets = [];
            let stock_ = [], source_container_, source_container__;
            if (this.memory.role === 'worker' || (this.memory.role === 'carrier' &&
                        !this.memory.roaming &&
                        !room_filled(this.memory.spawn))){
                            // Não deveria depender de room_filled, e sim de ter
                            // passado em todos os recharge sem pegar alvo
                stock_ = stock.filter(procure_filter(this));
                stock_ = stock_.filter(only_spawn_room(this))
            }
            source_container_ = source_container.filter(procure_filter(this));
            stock_ = stock_.filter(only_spawn_room(this))
            let energy_
            if (energy === undefined){
                energy_ = find(FIND_DROPPED_ENERGY, {
                    filter: procure_filter(this)
                });
            }
            if (this.memory.roaming && this.memory.role === 'carrier'){
                source_container_ = source_container_.filter(
                            s => spawn.procure_rooms_table[this.memory.spawn].indexOf(s.room.name) !== -1);
                energy_ = energy_.filter(
                            s => spawn.procure_rooms_table[this.memory.spawn].indexOf(s.room.name) !== -1);
            }

            targets = targets.concat(energy_, stock_, source_container_)

            if (this.memory.role === 'worker'){
                let link = this.get_structure(STRUCTURE_LINK);
                if (link && procure_filter(this)(link)){
                    if (this.pos.inRangeTo(link,3)){
                        targets = [link];
                    } else {
                        targets.push(link);
                    }
                }
                let targets_here = targets.filter(s => s && s.room.name === this.room.name)
                if (targets_here.length && targets_here[0]){
                    targets = targets_here
                }
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
                    this.memory.expires_p = Game.time + CACHE_TIME_TO_LIVE
                } else {
                    this.memory.expires_p = Game.time + CACHE_TIME_TO_LIVE * 3
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
            this.memory.energy_from = memory.pack(target);
        }
        return
    }
    return -1;
}

Creep.prototype.upgrade = function(lvl, room)
{
    lvl = lvl || 11;
    if (room === undefined){
        room = Game.spawns[this.memory.spawn].room
    } else if (typeof room === 'string'){
        let name = room
        room = Game.rooms[name]
        if (room === undefined){
            console.log('Error: room', name, 'not found')
            return -1;
        }
    }
    let controller = room.controller
    if (this.memory.role === 'worker' && controller &&
            //(memory.upgraders[room].length < 2 ||
            // memory.upgraders[room].indexOf(this.id) !== -1) &&
            (controller.level < lvl ||
                controller.ticksToDowngrade < 3000)){
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
    let pos = new RoomPosition(25, 25, target_room)

    let enemy = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: c => c.owner.username !== 'Muddal',
    });

    let heal_target = this.pos.findClosestByRange(
                          healer.heal_targets()[this.pos.roomName]) ||
                          healer.heal_targets_all().length && healer.heal_targets_all()[0]
    let ret
    //if (this.has(HEAL) && heal_target) {
    if (this.has(HEAL) && heal_target && !this.pos.isNearTo(enemy)){
        if (this.pos.isNearTo(heal_target)){
            ret = this.heal(heal_target)
        } else {
            ret = this.rangedHeal(heal_target)
        }
    }
    if (enemy){
        console.log('enemy')
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
        console.log(this.name, 'done')
        this.memory.done = false
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
}
Creep.prototype.idle = function(){
    spawn.counters[this.memory.spawn].idle += 1

    if ((this.memory.expires_i || 0) < Game.time){
        this.memory.expires_i = Game.time + 3
    }
    flag = Game.flags[idle_flag[this.memory.spawn]];
    if (flag && !this.pos.inRangeTo(flag,4)){
        this.moveTo(flag, default_path_opts);
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
    let over_road = this.pos.lookFor(LOOK_STRUCTURES);
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

function room_filled(spawn){
    return spawn_filled[spawn] &&
           tower_filled[spawn] &&
           link_filled[spawn]
}

function use_storage(s){
    return !room_filled(spawn.room_to_spawn[s.room.name]) ||
                s.store[RESOURCE_ENERGY] > 300E3
}


module.exports = {
    is_stock: is_stock,
    room_filled: room_filled,
    has_space: has_space,
    use_storage: use_storage,
    default_path_opts: default_path_opts,

}

