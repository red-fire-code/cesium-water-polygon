

# 自定义primitive如何使用
# 就是自定义了一个类、只需要new即可
# 举例：
let positions = Cesium.Cartesian3.fromDegreesArray([108.80411007, 31.62869524, 108.760164758, 24.59744524, 118.64786007, 24.59744524,118.625887414, 31.62869524,])

let polygon = new WaterPolygon({
    positions: positions,
})
viewer.scene.primitives.add(polygon.primitive)

# 所以就是导入、new、添加到地图上，注意前提，由于还是基于cesium、所以必须安装cesium才能使用

# 传参：（请保证传递的数值都为float类型即1--->1.0）

#       waterColor: 颜色字符串：(#FFFFFF、rgb、rgba...) 水体的基本颜色---默认rgb(0.1, 0.19, 0.22)
#       alpha: 数字 //水体的透明度---1.0
#       positions: [] //直接传入点位数组--和geojson不能一起使用。
#       primitive: Cesium.Primitive | null //返回值primitive
#       speed?: Number//水流动的速度
#       choppy?: Number//控制纹理的重复次数
#       height?: Number//波涛汹涌的程度
#       freq?: Number //海浪的频率
#       geoJson?: Cesium.DataSource//直接传递读取的geojson数据

方式一：直接传递数组

        let positions = Cesium.Cartesian3.fromDegreesArray([108.80411007, 31.62869524, 108.760164758, 24.59744524, 118.64786007, 24.59744524,118.625887414, 31.62869524])
        let polygon = new WaterPolygon({
            positions: positions,
        })
        viewer.scene.primitives.add(polygon.primitive)

方式二：传入读取的json数据

         Cesium.GeoJsonDataSource.load(geoJson).then((dataSource) => {         
            let polygon = new WaterPolygon({           
                geoJson: dataSource,
                waterColor: 'rgba(26, 47, 66, 1.0)',
                alpha: 0.9

            })        
            viewer.scene.primitives.add(polygon.primitive)        
        });
