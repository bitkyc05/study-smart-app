import { useState, useEffect, useRef, useMemo } from 'react'

export interface ChartDimensions {
  width: number
  height: number
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface UseResponsiveChartOptions {
  // 기본 차원
  defaultHeight?: number
  aspectRatio?: number
  
  // 여백
  margin?: Partial<ChartDimensions['margin']>
  
  // 브레이크포인트별 설정
  breakpoints?: {
    sm?: Partial<ChartDimensions>
    md?: Partial<ChartDimensions>
    lg?: Partial<ChartDimensions>
    xl?: Partial<ChartDimensions>
  }
  
  // 디바운스 지연 시간
  debounceDelay?: number
}

export function useResponsiveChart(options: UseResponsiveChartOptions = {}) {
  const {
    defaultHeight = 300,
    aspectRatio,
    margin = {},
    breakpoints = {},
    debounceDelay = 100
  } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 0,
    height: defaultHeight,
    margin: {
      top: margin.top || 20,
      right: margin.right || 20,
      bottom: margin.bottom || 40,
      left: margin.left || 60
    }
  })

  // 현재 브레이크포인트 결정
  const currentBreakpoint = useMemo(() => {
    const width = dimensions.width
    if (width < 640) return 'sm'
    if (width < 768) return 'md'
    if (width < 1024) return 'lg'
    return 'xl'
  }, [dimensions.width])

  // 브레이크포인트별 설정 적용
  const appliedDimensions = useMemo(() => {
    const breakpointConfig = breakpoints[currentBreakpoint] || {}
    
    return {
      ...dimensions,
      ...breakpointConfig,
      margin: {
        ...dimensions.margin,
        ...(breakpointConfig.margin || {})
      }
    }
  }, [dimensions, currentBreakpoint, breakpoints])

  useEffect(() => {
    if (!containerRef.current) return

    let timeoutId: NodeJS.Timeout

    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(timeoutId)
      
      timeoutId = setTimeout(() => {
        for (const entry of entries) {
          const { width } = entry.contentRect
          
          let height = defaultHeight
          if (aspectRatio) {
            height = width / aspectRatio
          }

          setDimensions(prev => ({
            ...prev,
            width,
            height
          }))
        }
      }, debounceDelay)
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [defaultHeight, aspectRatio, debounceDelay])

  // 차트 설정 계산
  const chartConfig = useMemo(() => {
    const innerWidth = appliedDimensions.width - 
      appliedDimensions.margin.left - 
      appliedDimensions.margin.right
    
    const innerHeight = appliedDimensions.height - 
      appliedDimensions.margin.top - 
      appliedDimensions.margin.bottom

    return {
      ...appliedDimensions,
      innerWidth: Math.max(0, innerWidth),
      innerHeight: Math.max(0, innerHeight),
      breakpoint: currentBreakpoint
    }
  }, [appliedDimensions, currentBreakpoint])

  // 반응형 스타일
  const responsiveStyles = useMemo(() => {
    const styles: Record<string, any> = {
      fontSize: '14px',
      tickSize: 5,
      strokeWidth: 2
    }

    switch (currentBreakpoint) {
      case 'sm':
        styles.fontSize = '12px'
        styles.tickSize = 3
        styles.strokeWidth = 1.5
        break
      case 'md':
        styles.fontSize = '13px'
        styles.tickSize = 4
        styles.strokeWidth = 2
        break
      case 'lg':
        styles.fontSize = '14px'
        styles.tickSize = 5
        styles.strokeWidth = 2
        break
      case 'xl':
        styles.fontSize = '16px'
        styles.tickSize = 6
        styles.strokeWidth = 2.5
        break
    }

    return styles
  }, [currentBreakpoint])

  // 축 설정 계산
  const axisConfig = useMemo(() => {
    const isMobile = currentBreakpoint === 'sm'
    const isTablet = currentBreakpoint === 'md'

    return {
      // X축 설정
      xAxis: {
        angle: isMobile ? -45 : 0,
        textAnchor: isMobile ? 'end' : 'middle',
        height: isMobile ? 60 : 40,
        interval: isMobile ? 1 : 0,
        tick: {
          fontSize: responsiveStyles.fontSize
        }
      },
      
      // Y축 설정
      yAxis: {
        width: isMobile ? 40 : isTablet ? 50 : 60,
        tick: {
          fontSize: responsiveStyles.fontSize
        }
      }
    }
  }, [currentBreakpoint, responsiveStyles])

  return {
    containerRef,
    dimensions: chartConfig,
    responsiveStyles,
    axisConfig,
    breakpoint: currentBreakpoint,
    isLoading: dimensions.width === 0
  }
}

// 특정 차트 타입을 위한 프리셋
export function useBarChartResponsive(options?: UseResponsiveChartOptions) {
  return useResponsiveChart({
    margin: {
      top: 20,
      right: 30,
      bottom: 60,
      left: 70
    },
    breakpoints: {
      sm: {
        margin: { top: 10, right: 10, bottom: 80, left: 50 }
      },
      md: {
        margin: { top: 15, right: 20, bottom: 70, left: 60 }
      }
    },
    ...options
  })
}

export function useLineChartResponsive(options?: UseResponsiveChartOptions) {
  return useResponsiveChart({
    margin: {
      top: 20,
      right: 30,
      bottom: 50,
      left: 60
    },
    breakpoints: {
      sm: {
        margin: { top: 10, right: 10, bottom: 60, left: 40 }
      }
    },
    ...options
  })
}

export function usePieChartResponsive(options?: UseResponsiveChartOptions) {
  return useResponsiveChart({
    aspectRatio: 1,
    margin: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    },
    ...options
  })
}