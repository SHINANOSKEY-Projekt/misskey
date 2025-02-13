<template>
<div class="vrvdvrys">
	<XPie class="pie" :value="cpuUsage" :title="`CPU`"/>
	<XPie class="pie" :value="memUsage" :title="`MEM`"/>
	<XPie class="pie" :value="diskUsage" :title="`DISK`"/>
</div>
</template>
	
<script lang="ts" setup>
import { onMounted, onBeforeUnmount } from 'vue';
import XPie from './pie.vue';
	
const props = defineProps<{
	connection: any,
	meta: any
}>();
	
let cpuUsage: number = $ref(0);
let memUsage: number = $ref(0);
let diskUsage: number = $ref(0);
	
function onStats(stats) {
	cpuUsage = stats.cpu;
	memUsage = stats.mem.active / props.meta.mem.total;
	diskUsage = props.meta.fs.used / props.meta.fs.total;
}
	
onMounted(() => {
	props.connection.on('stats', onStats);
});
	
onBeforeUnmount(() => {
	props.connection.off('stats', onStats);
});
</script>
	
	<style lang="scss" scoped>
	.vrvdvrys {
		display: flex;
		padding: 16px;
	
		> .pie {
			height: 82px;
			flex-shrink: 0;
			margin-right: 12px;
		}
	}
	</style>
