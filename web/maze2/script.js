// noinspection DuplicatedCode

class Random {
	constructor(seed) {
		this.m_w = seed;
		this.m_z = 987654321;
		this.mask = 0xffffffff;
	}

	next() {
		this.m_z = 36969 * (this.m_z & 65535) + (this.m_z >> 16) & this.mask;
		this.m_w = 18000 * (this.m_w & 65535) + (this.m_w >> 16) & this.mask;
		return ((this.m_z << 16) + this.m_w & this.mask) / 4294967296 + .5;
	}
}

const dungeonWidth = 220;
const dungeonHeight = 180;
const cellSize = 6;
const dungeonRoomSize = 10;
const seed = Date.now();
//const seed = 1674773190194;
//console.log(seed);
const rand = new Random(seed);
const minDepth = 4;
const splitChance = .35;
const tiles = {
	EMPTY: 0,
	WALL: 1,
	FLOOR: 2
};
const map = [];
const connections = [];
let tree;

const flatLeaf = tree => {
	const flat = [];
	const stack = [];
	let current = tree;

	while (stack.length > 0 || current !== null) {
		if (current !== null) {
			stack.push(current);
			current = current.left;
		} else {
			current = stack.pop();
			if (current.left === null && current.right === null)
				flat.push(current);
			current = current.right;
		}
	}

	return flat;
};

const adjacentBSP = (left, right) => {
	const flatL = flatLeaf(left);
	const flatR = flatLeaf(right);

	let found = false;
	for (let i = 0; i < flatL.length; i++) {
		if (found) break;
		const L = flatL[i];

		for (let j = 0; j < flatR.length; j++) {
			if (found) break;
			const R = flatR[j];

			if (L.bounds.x + L.bounds.w === R.bounds.x &&
				(L.bounds.y <= R.bounds.y + R.bounds.h && L.bounds.y >= R.bounds.y ||
					R.bounds.y <= L.bounds.y + L.bounds.h && R.bounds.y >= L.bounds.y)) {
				found = true;
			} else if (L.bounds.y + L.bounds.h === R.bounds.y &&
				(L.bounds.x <= R.bounds.x + R.bounds.w && L.bounds.x >= R.bounds.x ||
					R.bounds.x <= L.bounds.x + L.bounds.w && R.bounds.x >= L.bounds.x)) {
				found = true;
			}

			if (found) {
				return {
					left: L,
					right: R
				};
			}
		}
	}

	return null;
};

const hallPainter = (left, right) => {
	if (left.bounds.x + left.bounds.w === right.bounds.x) {
		// Left/right
		if (left.size.y + left.size.h - 3 < right.size.y ||
			right.size.y + right.size.h - 3 < left.size.y) {
			// Z Corridor
			const pointL = left.size.y + 1 + (rand.next() * (left.size.h - 2) | 0);
			const pointR = right.size.y + 1 + (rand.next() * (right.size.h - 2) | 0);

			let diff, mid;
			if (left.bounds.h >= right.bounds.h) {
				diff = left.bounds.x + left.bounds.w - 1 - (left.size.x + left.size.w);
				mid = (rand.next() * diff | 0) + left.size.x + left.size.w - 1;
			} else {
				diff = right.size.x - 1 - (right.bounds.x + 1);
				mid = (rand.next() * diff | 0) + right.bounds.x;
			}
			let x;

			for (x = left.size.x + left.size.w - 1; x <= mid; x++) {
				if (map[(pointL - 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(pointL - 1) * dungeonWidth + x] = tiles.WALL;
				map[pointL * dungeonWidth + x] = tiles.FLOOR;
				if (map[(pointL + 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(pointL + 1) * dungeonWidth + x] = tiles.WALL;
			}

			const lMin = Math.min(pointL - 1, pointR - 1);
			const lMax = Math.max(pointL + 1, pointR + 1);

			for (let y = lMin; y <= lMax; y++) {
				if (map[y * dungeonWidth + x - 1] !== tiles.FLOOR)
					map[y * dungeonWidth + x - 1] = tiles.WALL;

				if (y !== lMin && y !== lMax)
					map[y * dungeonWidth + x] = tiles.FLOOR;
				else if (map[y * dungeonWidth + x] !== tiles.FLOOR)
					map[y * dungeonWidth + x] = tiles.WALL;

				if (map[y * dungeonWidth + x + 1] !== tiles.FLOOR)
					map[y * dungeonWidth + x + 1] = tiles.WALL;
			}

			for (; x <= right.size.x; x++) {
				if (map[(pointR - 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(pointR - 1) * dungeonWidth + x] = tiles.WALL;
				map[pointR * dungeonWidth + x] = tiles.FLOOR;
				if (map[(pointR + 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(pointR + 1) * dungeonWidth + x] = tiles.WALL;
			}
		} else {
			const t = Math.min(left.size.y + left.size.h, right.size.y + right.size.h);
			const b = Math.max(left.size.y, right.size.y);

			let diff = t - 1 - (b + 1);
			diff = rand.next() * diff | 0;
			const pos = b + diff + 1;

			let len = right.size.x - (left.size.x + left.size.w - 1);
			for (let k = 0; k <= len; k++) {
				const _x = left.size.x + left.size.w - 1 + k;
				map[(pos - 1) * dungeonWidth + _x] = tiles.WALL;
				map[pos * dungeonWidth + _x] = tiles.FLOOR;
				map[(pos + 1) * dungeonWidth + _x] = tiles.WALL;
			}
		}
	} else {
		// Top/Bottom
		if (left.size.x + left.size.w - 3 < right.size.x ||
			right.size.x + right.size.w - 3 < left.size.x) {
			// Z Corridor
			const pointL = left.size.x + 1 + (rand.next() * (left.size.w - 2) | 0);
			const pointR = right.size.x + 1 + (rand.next() * (right.size.w - 2) | 0);

			let diff, mid;
			if (left.bounds.w >= right.bounds.w) {
				diff = (left.bounds.y + left.bounds.h) - (left.size.y + left.size.h);
				mid = (rand.next() * diff | 0) + left.size.y + left.size.h - 1;
			} else {
				diff = right.size.y - 1 - (right.bounds.y + 1);
				mid = (rand.next() * diff | 0) + right.bounds.y;
			}

			let y;

			for (y = left.size.y + left.size.h - 1; y <= mid; y++) {
				if (map[y * dungeonWidth + pointL - 1] !== tiles.FLOOR)
					map[y * dungeonWidth + pointL - 1] = tiles.WALL;
				map[y * dungeonWidth + pointL] = tiles.FLOOR;
				if (map[y * dungeonWidth + pointL + 1] !== tiles.FLOOR)
					map[y * dungeonWidth + pointL + 1] = tiles.WALL;
			}

			const lMin = Math.min(pointL - 1, pointR - 1);
			const lMax = Math.max(pointL + 1, pointR + 1);

			for (let x = lMin; x <= lMax; x++) {
				if (map[(y - 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(y - 1) * dungeonWidth + x] = tiles.WALL;

				if (x !== lMin && x !== lMax)
					map[y * dungeonWidth + x] = tiles.FLOOR;
				else if (map[y * dungeonWidth + x] !== tiles.FLOOR)
					map[y * dungeonWidth + x] = tiles.WALL;

				if (map[(y + 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(y + 1) * dungeonWidth + x] = tiles.WALL;
			}

			for (; y <= right.size.y; y++) {
				if (map[y * dungeonWidth + pointR - 1] !== tiles.FLOOR)
					map[y * dungeonWidth + pointR - 1] = tiles.WALL;
				map[y * dungeonWidth + pointR] = tiles.FLOOR;
				if (map[y * dungeonWidth + pointR + 1] !== tiles.FLOOR)
					map[y * dungeonWidth + pointR + 1] = tiles.WALL;
			}
		} else {
			const r = Math.min(left.size.x + left.size.w, right.size.x + right.size.w);
			const l = Math.max(left.size.x, right.size.x);

			let diff = r - 1 - (l + 1);
			diff = rand.next() * diff | 0;
			const pos = l + diff + 1;

			const len = right.size.y - (left.size.y + left.size.h - 1);
			for (let k = 0; k <= len; k++) {
				const _y = left.size.y + left.size.h - 1 + k;
				map[_y * dungeonWidth + pos - 1] = tiles.WALL;
				map[_y * dungeonWidth + pos] = tiles.FLOOR;
				map[_y * dungeonWidth + pos + 1] = tiles.WALL;
			}
		}
	}
};

const gStack = [{
	bounds: {
		x: 0,
		y: 0,
		w: dungeonWidth,
		h: dungeonHeight
	},
	left: null,
	right: null,
	parent: null,
	depth: 0
}];

//<editor-fold desc="generate">
tree = gStack[0];
let width = 0;
let height = 0;

while (gStack.length > 0) {
	let room = gStack.pop();

	if (room.bounds.w < dungeonRoomSize * 2 &&
		room.bounds.h < dungeonRoomSize * 2) {
		continue;
	}

	if (Math.min(room.bounds.w, room.bounds.h) < 5) {
		continue;
	}

	let split = splitChance;
	if (room.bounds.w > 2.5 * room.bounds.h ||
		room.bounds.h > 2.5 * room.bounds.w) {
		split *= 1.7;
	} else {
		split *= 1;
	}

	if (rand.next() > split && room.depth >= minDepth) {
		continue;
	}

	let dir;
	if (room.bounds.w >= 2.5 * room.bounds.h ||
		room.bounds.h < dungeonRoomSize * 2) {
		dir = .75;
	} else if (room.bounds.h > 2.5 * room.bounds.w ||
		room.bounds.h < dungeonRoomSize * 2) {
		dir = .25;
	} else {
		dir = rand.next();
	}


	if (dir > 0.5) {
		width = (rand.next() * 2 - 1) * (room.bounds.w - dungeonRoomSize * 2) * 0.5;
		width = room.bounds.w * 0.5 + (width | 0);

		room.left = {
			bounds: {
				x: room.bounds.x,
				y: room.bounds.y,
				w: width,
				h: room.bounds.h
			},
			left: null,
			right: null,
			parent: room,
			depth: room.depth + 1
		};

		room.right = {
			bounds: {
				x: room.bounds.x + width,
				y: room.bounds.y,
				w: room.bounds.w - width,
				h: room.bounds.h
			},
			left: null,
			right: null,
			parent: room,
			depth: room.depth + 1
		};
	} else {
		height = (rand.next() * 2 - 1) * (room.bounds.h - dungeonRoomSize * 2) * 0.5;
		height = room.bounds.h * 0.5 + (height | 0);

		room.left = {
			bounds: {
				x: room.bounds.x,
				y: room.bounds.y,
				w: room.bounds.w,
				h: height
			},
			left: null,
			right: null,
			parent: room,
			depth: room.depth + 1
		};

		room.right = {
			bounds: {
				x: room.bounds.x,
				y: room.bounds.y + height,
				w: room.bounds.w,
				h: room.bounds.h - height
			},
			left: null,
			right: null,
			parent: room,
			depth: room.depth + 1
		};
	}

	gStack.push(room.left);
	gStack.push(room.right);
}
//</editor-fold>

//<editor-fold desc="connect">
const sStack = [tree];
while (sStack.length > 0) {
	const room = sStack.pop();

	if (room === null) {
		continue;
	}

	sStack.push(room.left);
	sStack.push(room.right);

	const edge = adjacentBSP(room.left, room.right);
	if (edge !== null) {
		connections.push(edge);
	}
}
//</editor-fold>

//<editor-fold desc="map">
for (let i = 0; i < dungeonWidth * dungeonHeight; i++) {
	map[i] = tiles.EMPTY;
}

const rooms = flatLeaf(tree);

for (let i = 0; i < rooms.length; i++) {
	const room = rooms[i];

	const w = dungeonRoomSize + rand.next() * (room.bounds.w - dungeonRoomSize - 2) | 0;
	const h = dungeonRoomSize + rand.next() * (room.bounds.h - dungeonRoomSize - 2) | 0;
	const x = room.bounds.x + 1 + (room.bounds.w - w - 1) * rand.next() | 0;
	const y = room.bounds.y + 1 + (room.bounds.h - h - 1) * rand.next() | 0;

	for (let _y = y; _y < h + y; _y++) {
		for (let _x = x; _x < w + x; _x++) {
			if (_x === x || _x === w + x - 1 ||
				_y === y || _y === h + y - 1) {
				map[_y * dungeonWidth + _x] = tiles.WALL;
			} else {
				map[_y * dungeonWidth + _x] = tiles.FLOOR;
			}
		}
	}

	room.size = {
		x: x,
		y: y,
		w: w,
		h: h
	};
}

for (let i = 0; i < connections.length; i++) {
	const hall = connections[i];
	hallPainter(hall.left, hall.right);
}
//</editor-fold>

//<editor-fold desc="canvas">
const canvas = document.createElement('canvas');
canvas.width = dungeonWidth * cellSize;
canvas.height = dungeonHeight * cellSize;
const ctx = canvas.getContext('2d');

// draw room
ctx.strokeStyle = 'rgb(143,143,143)';
ctx.lineWidth = .5;
let item;
for (let i = 0; i < connections.length; i++) {
	item = connections[i];

	const lb = item.left.bounds;
	const rb = item.right.bounds;

	ctx.strokeRect(lb.x * cellSize, lb.y * cellSize, lb.w * cellSize, lb.h * cellSize);
	ctx.strokeRect(rb.x * cellSize, rb.y * cellSize, rb.w * cellSize, rb.h * cellSize);
}

// draw tile
for (let y = 0; y < dungeonHeight; y++) {
	for (let x = 0; x < dungeonWidth; x++) {
		const id = map[y * dungeonWidth + x];

		if (id === 0 || id === null) {
			continue;
		}

		if (id === tiles.WALL) {
			ctx.fillStyle = 'rgb(0,70,61)';
		} else if (id === tiles.FLOOR) {
			ctx.fillStyle = 'rgb(0,0,0)';
		}

		ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
	}
}

// draw connection
ctx.strokeStyle = 'rgb(255,0,0)';
ctx.beginPath();
for (let i = 0; i < connections.length; i++) {
	item = connections[i];

	ctx.moveTo(
		(item.left.size.x + item.left.size.w * 0.5) * cellSize,
		(item.left.size.y + item.left.size.h * 0.5) * cellSize
	);
	ctx.lineTo(
		(item.right.size.x + item.right.size.w * 0.5) * cellSize,
		(item.right.size.y + item.right.size.h * 0.5) * cellSize
	);
}
ctx.stroke();

// draw grid
ctx.beginPath();
ctx.strokeStyle = "rgba(255,255,255,0.4)";
ctx.lineWidth = 0.5;

for (let i = 0; i <= dungeonWidth; i++) {
	ctx.moveTo(i * cellSize, 0);
	ctx.lineTo(i * cellSize, dungeonHeight * cellSize);
}
for (let i = 0; i <= dungeonHeight; i++) {
	ctx.moveTo(0, i * cellSize);
	ctx.lineTo(dungeonWidth * cellSize, i * cellSize)
}
ctx.stroke();
ctx.closePath();

document.body.appendChild(canvas);
//</editor-fold>

export {}