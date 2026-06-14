import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  PanResponder,
  StyleSheet,
  LayoutChangeEvent,
  GestureResponderEvent,
} from 'react-native';
import { C } from '@/constants/theme';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  step: number;
  onValueChange: (v: number) => void;
  formatValue: (v: number) => string;
}

export default function Slider({
  label,
  min,
  max,
  value,
  step,
  onValueChange,
  formatValue,
}: SliderProps) {
  const trackWidthRef = useRef(0);

  const clamp = useCallback(
    (x: number) => {
      const ratio = Math.max(0, Math.min(1, x / Math.max(trackWidthRef.current, 1)));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        onValueChange(clamp(evt.nativeEvent.locationX));
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        onValueChange(clamp(evt.nativeEvent.locationX));
      },
    })
  ).current;

  const fillRatio = trackWidthRef.current > 0
    ? ((value - min) / (max - min)) * 100
    : ((value - min) / (max - min)) * 100;

  const thumbLeft = `${((value - min) / (max - min)) * 100}%`;

  return (
    <View style={s.wrap}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.valueText}>{formatValue(value)}</Text>
      </View>

      <View
        style={s.trackWrap}
        {...panResponder.panHandlers}
        onLayout={(e: LayoutChangeEvent) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
        }}>
        {/* Track */}
        <View style={s.track} />
        {/* Fill */}
        <View style={[s.fill, { width: `${((value - min) / (max - min)) * 100}%` as any }]} />
        {/* Thumb */}
        <View style={[s.thumb, { left: thumbLeft as any }]} />
      </View>

      <View style={s.minMax}>
        <Text style={s.minMaxText}>{formatValue(min)}</Text>
        <Text style={s.minMaxText}>{formatValue(max)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 24 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: {
    color: C.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  valueText: {
    color: C.brand,
    fontSize: 13,
    fontWeight: '700',
  },
  trackWrap: {
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 8,
  },
  track: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 4,
    backgroundColor: C.elevated,
    borderRadius: 2,
  },
  fill: {
    position: 'absolute',
    left: 8,
    height: 4,
    backgroundColor: C.brand,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.brand,
    marginLeft: -11,
    top: '50%' as any,
    marginTop: -11,
    borderWidth: 3,
    borderColor: C.white,
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  minMax: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  minMaxText: { color: C.textFaint, fontSize: 10 },
});
