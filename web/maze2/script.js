class Random {
	constructor(seed) {
		this.m_w = seed;
		this.m_z = 987654321;
		this.mask = 0xffffffff;
	}

	next() {
		this.m_z = 36969 * (this.m_z & 65535) + (this.m_z >> 16) & this.mask;
		this.m_w = 18000 * (this.m_w & 65535) + (this.m_w >> 16) & this.mask;
		let result = (this.m_z << 16) + this.m_w & this.mask;
		result /= 4294967296;
		return result + 0.5;
	}
}

const dungeonWidth = window.innerWidth;
const dungeonHeight = window.innerHeight;
const dungeonRoomSize = 10;
const rand = new Random(Date.now());
const minDepth = 4;
const splitChance = .35;
const tiles = {
	EMPTY: 0,
	WALL: 1,
	FLOOR: 2
};
const map = [];
const connections = [];
let tree = null;

const splitMod = (width, height) => {
	if (width > 2.5 * height ||
		height > 2.5 * width)
		return 1.7;
	else
		return 1.0;
};

const splitDir = (width, height) => {
	if (width >= 2.5 * height ||
		height < dungeonRoomSize * 2)
		return 0.75;
	else if (height > 2.5 * width ||
		width < dungeonRoomSize * 2)
		return 0.25;
	else
		return rand.next();
};

const flatLeafBSP = tree => {
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
	const flatL = flatLeafBSP(left);
	const flatR = flatLeafBSP(right);

	let found = false;
	for (let i = 0; i < flatL.length; i++) {
		if (found) break;
		const L = flatL[i];

		for (let j = 0; j < flatR.length; j++) {
			if (found) break;
			const R = flatR[j];

			if (L.bounds.x + L.bounds.width === R.bounds.x &&
				(L.bounds.y <= R.bounds.y + R.bounds.height && L.bounds.y >= R.bounds.y ||
					R.bounds.y <= L.bounds.y + L.bounds.height && R.bounds.y >= L.bounds.y)) {
				found = true;
			} else if (L.bounds.y + L.bounds.height === R.bounds.y &&
				(L.bounds.x <= R.bounds.x + R.bounds.width && L.bounds.x >= R.bounds.x ||
					R.bounds.x <= L.bounds.x + L.bounds.width && R.bounds.x >= L.bounds.x)) {
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

const generate = () => {
	const stack = [{
		bounds: {
			x: 0,
			y: 0,
			width: dungeonWidth,
			height: dungeonHeight
		},
		left: null,
		right: null,
		parent: null,
		depth: 0
	}];

	tree = stack[0];
	let dir = 0;
	let room = null;
	let width = 0;
	let height = 0;

	while (stack.length > 0) {
		room = stack.pop();

		if (room.bounds.width < dungeonRoomSize * 2 &&
			room.bounds.height < dungeonRoomSize * 2) {
			continue;
		}

		if (Math.min(room.bounds.width, room.bounds.height) < 250) {
			continue;
		}

		let split = splitChance * splitMod(room.bounds.width, room.bounds.height);

		if (rand.next() > split && room.depth >= minDepth) {
			continue;
		}

		dir = splitDir(room.bounds.width, room.bounds.height);

		if (dir > 0.5) {
			width = (rand.next() * 2 - 1) * (room.bounds.width - dungeonRoomSize * 2) * 0.5;
			width = room.bounds.width * 0.5 + (width | 0);

			room.left = {
				bounds: {
					x: room.bounds.x,
					y: room.bounds.y,
					width: width,
					height: room.bounds.height
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
					width: room.bounds.width - width,
					height: room.bounds.height
				},
				left: null,
				right: null,
				parent: room,
				depth: room.depth + 1
			};
		} else {
			height = (rand.next() * 2 - 1) * (room.bounds.height - dungeonRoomSize * 2) * 0.5;
			height = room.bounds.height * 0.5 + (height | 0);

			room.left = {
				bounds: {
					x: room.bounds.x,
					y: room.bounds.y,
					width: room.bounds.width,
					height: height
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
					width: room.bounds.width,
					height: room.bounds.height - height
				},
				left: null,
				right: null,
				parent: room,
				depth: room.depth + 1
			};
		}

		stack.push(room.left);
		stack.push(room.right);
	}
};
const connect = () => {
	const stack = [tree];
	while (stack.length > 0) {
		const room = stack.pop();

		if (room === null)
			continue;

		stack.push(room.left);
		stack.push(room.right);

		const edge = adjacentBSP(room.left, room.right);
		if (edge !== null) {
			connections.push(edge);
		}
	}
};

const paint = () => {
	for (let i = 0; i < dungeonWidth * dungeonHeight; i++) {
		map[i] = tiles.EMPTY;
	}

	const rooms = flatLeafBSP(tree);

	for (let i = 0; i < rooms.length; i++) {
		const room = rooms[i];

		const w = dungeonRoomSize + rand.next() * (room.bounds.width - dungeonRoomSize - 2) | 0;
		const h = dungeonRoomSize + rand.next() * (room.bounds.height - dungeonRoomSize - 2) | 0;
		const x = room.bounds.x + 1 + (room.bounds.width - w - 1) * rand.next() | 0;
		const y = room.bounds.y + 1 + (room.bounds.height - h - 1) * rand.next() | 0;

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
			width: w,
			height: h
		};
	}

	for (let i = 0; i < connections.length; i++) {
		const hall = connections[i];
		hallPainter(hall.left, hall.right);
	}
};

const hallPainter = (left, right) => {
	let diff, mid;

	if (left.bounds.x + left.bounds.width === right.bounds.x) {
		// Left/right
		if (left.size.y + left.size.height - 3 < right.size.y ||
			right.size.y + right.size.height - 3 < left.size.y) {
			// Z Corridor
			const pointL = left.size.y + 1 + (rand.next() * (left.size.height - 2) | 0);
			const pointR = right.size.y + 1 + (rand.next() * (right.size.height - 2) | 0);

			if (left.bounds.height >= right.bounds.height) {
				diff = left.bounds.x + left.bounds.width - 1 - (left.size.x + left.size.width);
				mid = (rand.next() * diff | 0) + left.size.x + left.size.width - 1;
			} else {
				diff = right.size.x - 1 - (right.bounds.x + 1);
				mid = (rand.next() * diff | 0) + right.bounds.x;
			}
			let x;

			for (x = left.size.x + left.size.width - 1; x <= mid; x++) {
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
			const t = Math.min(left.size.y + left.size.height, right.size.y + right.size.height);
			const b = Math.max(left.size.y, right.size.y);

			let diff = t - 1 - (b + 1);
			diff = rand.next() * diff | 0;
			const pos = b + diff + 1;

			let len = right.size.x - (left.size.x + left.size.width - 1);
			for (let k = 0; k <= len; k++) {
				const _x = left.size.x + left.size.width - 1 + k;
				map[(pos - 1) * dungeonWidth + _x] = tiles.WALL;
				map[pos * dungeonWidth + _x] = tiles.FLOOR;
				map[(pos + 1) * dungeonWidth + _x] = tiles.WALL;
			}
		}
	} else {
		// Top/Bottom
		if (left.size.x + left.size.width - 3 < right.size.x ||
			right.size.x + right.size.width - 3 < left.size.x) {
			// Z Corridor
			const pointL = left.size.x + 1 + (rand.next() * (left.size.width - 2) | 0);
			const pointR = right.size.x + 1 + (rand.next() * (right.size.width - 2) | 0);

			if (left.bounds.width >= right.bounds.width) {
				diff = (left.bounds.y + left.bounds.height) - (left.size.y + left.size.height);
				mid = (rand.next() * diff | 0) + left.size.y + left.size.height - 1;
			} else {
				diff = right.size.y - 1 - (right.bounds.y + 1);
				mid = (rand.next() * diff | 0) + right.bounds.y;
			}

			let y;

			for (y = left.size.y + left.size.height - 1; y <= mid; y++) {
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
			const r = Math.min(left.size.x + left.size.width, right.size.x + right.size.width);
			const l = Math.max(left.size.x, right.size.x);

			let diff = r - 1 - (l + 1);
			diff = rand.next() * diff | 0;
			const pos = l + diff + 1;

			const len = right.size.y - (left.size.y + left.size.height - 1);
			for (let k = 0; k <= len; k++) {
				const _y = left.size.y + left.size.height - 1 + k;
				map[_y * dungeonWidth + pos - 1] = tiles.WALL;
				map[_y * dungeonWidth + pos] = tiles.FLOOR;
				map[_y * dungeonWidth + pos + 1] = tiles.WALL;
			}
		}
	}
};

generate();
connect();
paint();

const canvas = document.createElement('canvas');
canvas.width = dungeonWidth;
canvas.height = dungeonHeight;
const ctx = canvas.getContext('2d');

ctx.strokeStyle = 'rgba(187,215,6,0.06)';
let item;
for (let i = 0; i < connections.length; i++) {
	item = connections[i];

	ctx.strokeRect(item.left.bounds.x, item.left.bounds.y,
		item.left.bounds.width, item.left.bounds.height);
	ctx.strokeRect(item.right.bounds.x, item.right.bounds.y,
		item.right.bounds.width, item.right.bounds.height);
}

for (let y = 0; y < dungeonHeight; y++) {
	for (let x = 0; x < dungeonWidth; x++) {
		const id = map[y * dungeonWidth + x];

		if (id === 0 || id === null) {
			continue;
		}

		if (id === tiles.WALL) {
			ctx.fillStyle = 'rgb(0,4,238)';
		} else if (id === tiles.FLOOR) {
			ctx.fillStyle = 'rgba(211,44,119,0.2)';
		}

		ctx.fillRect(x, y, 1, 1);
	}
}

ctx.strokeStyle = 'rgb(255,0,0)';
ctx.beginPath();
for (let i = 0; i < connections.length; i++) {
	item = connections[i];

	ctx.moveTo(item.left.size.x + item.left.size.width * 0.5,
		item.left.size.y + item.left.size.height * 0.5);
	ctx.lineTo(item.right.size.x + item.right.size.width * 0.5,
		item.right.size.y + item.right.size.height * 0.5);
}
ctx.stroke();

canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
document.body.appendChild(canvas);

export {}