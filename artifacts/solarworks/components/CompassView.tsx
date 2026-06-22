import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Platform } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Props {
  bearing: number;
}

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

export function CompassView({ bearing }: Props) {
  const colors = useColors();
  const rotation = useRef(new Animated.Value(bearing)).current;

  useEffect(() => {
    Animated.spring(rotation, {
      toValue: bearing,
      useNativeDriver: false,
      friction: 6,
      tension: 40,
    }).start();
  }, [bearing]);

  const rotate = rotation.interpolate({
    inputRange: [-360, 360],
    outputRange: ["-360deg", "360deg"],
  });

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.border} strokeWidth={2} fill={colors.card} />
        <Circle cx={cx} cy={cy} r={4} fill={colors.primary} />
        {["N", "E", "S", "W"].map((dir, i) => {
          const angle = (i * 90 * Math.PI) / 180;
          const tx = cx + (r - 16) * Math.sin(angle);
          const ty = cy - (r - 16) * Math.cos(angle);
          return (
            <SvgText
              key={dir}
              x={tx}
              y={ty + 4}
              textAnchor="middle"
              fill={dir === "S" ? colors.primary : colors.mutedForeground}
              fontSize={13}
              fontWeight="700"
            >
              {dir}
            </SvgText>
          );
        })}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          const isMajor = i % 9 === 0;
          const innerR = isMajor ? r - 22 : r - 14;
          const x1 = cx + r * Math.sin(angle);
          const y1 = cy - r * Math.cos(angle);
          const x2 = cx + innerR * Math.sin(angle);
          const y2 = cy - innerR * Math.cos(angle);
          return (
            <Line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={colors.border}
              strokeWidth={isMajor ? 2 : 1}
            />
          );
        })}
      </Svg>
      <Animated.View
        style={[
          styles.arrowContainer,
          { width: size, height: size, transform: [{ rotate }] },
        ]}
      >
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Polygon
            points={`${cx},${cy - r + 28} ${cx - 8},${cy} ${cx},${cy + 20} ${cx + 8},${cy}`}
            fill={colors.primary}
            opacity={0.9}
          />
          <Polygon
            points={`${cx},${cy + r - 28} ${cx - 6},${cy} ${cx},${cy - 20} ${cx + 6},${cy}`}
            fill={colors.mutedForeground}
            opacity={0.5}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 180,
    height: 180,
    alignSelf: "center",
  },
  arrowContainer: {
    position: "absolute",
  },
});
