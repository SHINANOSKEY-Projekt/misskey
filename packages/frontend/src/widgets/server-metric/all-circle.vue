<template>
	<div class="vrvdvsas">
		<XPie class="pie" :value="cpuUsage" :title="`CPU`"/>
		<XPie class="pie" :value="memUsage" :title="`MEM`"/>
		<XPie class="pie" :value="diskUsage" :title="`DISK`"/>
	</div>
	</template>
		
	<script lang="ts" setup>
	import { onMounted, onBeforeUnmount, ref } from 'vue';
	import XPie from './pie.vue';
		
	const props = defineProps<{
		connection: any,
		meta: any
	}>();
		
	const cpuUsage: number = ref(0);
	const memUsage: number = ref(0);
	const diskUsage: number = ref(0);
		
	function onStats(stats) {
		cpuUsage.value = stats.cpu;
		memUsage.value = stats.mem.active / props.meta.mem.total;
		diskUsage.value = props.meta.fs.used / props.meta.fs.total;
	}
		
	onMounted(() => {
		props.connection.on('stats', onStats);
	});
		
	onBeforeUnmount(() => {
		props.connection.off('stats', onStats);
	});
	</script>
		
		<style lang="scss" scoped>
		.vrvdvsas {
			display: flex;
			padding: 16px;
		
			> .pie {
				height: 82px;
				flex-shrink: 0;
				margin-right: 12px;
			}
		}
		</style>