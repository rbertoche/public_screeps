/**
 * The Guard hasn't been improved in a while, I've mostly just moved on to archers for now. I'll come back and
 * work on this one later
 * @param creep
 */
 
find = require('find');
creep_ = require('creep');
 
var heal_targets_all;
var urgent_heal_targets_all;
var heal_targets;
var urgent_heal_targets;
var warriors;
var flag_warriors;

var healer = {
    heal_targets: function(){ return heal_targets; },
    urgent_heal_targets: function(){ return urgent_heal_targets; },
    heal_targets_all: function(){ return heal_targets_all; },
    urgent_heal_targets_all: function(){ return urgent_heal_targets_all; },
    
	parts: [
	    //[Game.TOUGH, Game.MOVE, , Game.ATTACK]
		[TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL],
		[TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL],
		[TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL],
		[TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE,
		    MOVE, MOVE, MOVE, MOVE, HEAL, HEAL],
		[TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE,
		    MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL],
		[TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE,
		    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, HEAL],
		[TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE,
		    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, HEAL, HEAL],
	],
	
	update: function()
	{
        heal_targets_all = find(FIND_MY_CREEPS, {
            filter: function (c){
                    return c.hits < c.hitsMax;
            }
        });
        urgent_heal_targets_all = find(FIND_MY_CREEPS, {
            filter: function (c){
                    return c.hits < c.hitsMax / 2;
            }
        });
        heal_targets = {};
        urgent_heal_targets = {};
        var rooms = Object.keys(Game.rooms);
        for (var room in rooms){
            heal_targets[room] = heal_targets_all.filter(c => c.pos.roomName == room);
            urgent_heal_targets[room] = urgent_heal_targets_all.filter(c => c.pos.roomName == room);
        }
        /*
        flag_warriors = find(FIND_MY_CREEPS,{
		    filter: function(c){
		        return c && creep_.has(c, ATTACK) && c.pos.inRangeTo(Game.flags.Flag6,6);
		    }
		});
		*/
        warriors = find(FIND_MY_CREEPS,{
		    filter: function(c){
		        return creep_.has(c, ATTACK);
		    }
		});
	},

	action: function(creep)
	{
	    var hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
		var close_hostiles = _.filter(hostiles, function(c){
		                        return creep.pos.inRangeTo(c,1);
		});
		
		if (urgent_heal_targets_all.length){
            var closest = creep.pos.findClosestByRange(urgent_heal_targets_all) || 
                    (urgent_heal_targets_all.length && urgent_heal_targets_all[0]);
            if(!creep.pos.isNearTo(closest) || creep.at_exit) {
                creep.moveTo(closest);
            }
            if (closest){
                creep.heal(closest);
                creep.rangedHeal(closest);
		    }
		    return
		} else if (heal_targets_all.length){
		    var closest = creep.pos.findClosestByRange(heal_targets_all) || 
                    (heal_targets_all.length && heal_targets_all[0]);
		    if(!creep.pos.isNearTo(closest) || creep.at_exit) {
                creep.moveTo(closest);
            }
            if (closest){
                creep.heal(closest);
                creep.rangedHeal(closest);
		    }
		    return
		/*
		} else if (flag_warriors.length){
		    var closest = creep.pos.findClosestByRange(flag_warriors);
		    if (closest){
			    creep.moveTo(closest);
		    } else if (flag_warriors.length){
		        creep.moveTo(flag_warriors[0]);
		    }*/
			//console.log('this.rest();');
		} else if (warriors.length){
		    //var closest = creep.pos.findClosestByRange(warriors);
		    var closest = _.sortBy(warriors, c => c.body.length);
		    closest = closest[closest.length - 1];
		    if (closest){
			    creep.moveTo(closest);
		    } else if (warriors.length){
		        creep.moveTo(warriors[0]);
		    }
		    return
		    //console.log('this.rest();');
		} else {
	           flag = Game.flags.Flag2;
		    if (!creep.pos.inRangeTo(flag,2)){
		        creep.moveTo(flag);
		    }
		}
		if (close_hostiles.length || creep.room.find(FIND_HOSTILE_STRUCTURES, {
		    filter: s => s.structureType == STRUCTURE_TOWER,
		}).length) {
		    creep.moveTo(Game.spawns.Spawn1);
		}
	}
};

module.exports = healer;